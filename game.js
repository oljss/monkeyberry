
// Scene setup
const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
);
camera.position.set(0, 15, 25);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

// HDRI Lighting
const rgbeLoader = new THREE.RGBELoader();
rgbeLoader.load('/images/animestyled_hdr.hdr', function(texture) {
    texture.mapping = THREE.EquirectangularReflectionMapping;
    
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envMap = pmremGenerator.fromEquirectangular(texture).texture;

    scene.background = envMap;
    scene.environment = envMap;

    texture.dispose();
    pmremGenerator.dispose();
});

// Info box elements
const velocityElement = document.getElementById('velocity-info');
const positionElement = document.getElementById('position-info');

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 3);
directionalLight.position.set(20, 30, 20);
directionalLight.castShadow = true;
directionalLight.shadow.mapSize.width = 2048;
directionalLight.shadow.mapSize.height = 2048;
directionalLight.shadow.camera.left = -50;
directionalLight.shadow.camera.right = 50;
directionalLight.shadow.camera.top = 50;
directionalLight.shadow.camera.bottom = -50;
directionalLight.shadow.camera.near = 0.5;
directionalLight.shadow.camera.far = 500;
scene.add(directionalLight);

// Physics world
const world = new CANNON.World();
world.gravity.set(0, -20, 0);
world.defaultContactMaterial.friction = 0.3;
world.defaultContactMaterial.restitution = 0.3;

const mixers = [];
const platformBodies = [];
// Load the map model and create a single Trimesh collider for it
const mapLoader = new THREE.GLTFLoader();
mapLoader.load('/models/monkeymap1.gltf', (gltf) => {
    const mapModel = gltf.scene;
    const clips = gltf.animations;

    if (clips && clips.length) {
        const mixer = new THREE.AnimationMixer(mapModel);
        for (const clip of clips) {
            mixer.clipAction(clip).play();
        }
        mixers.push(mixer);
    }
    
    // Create a single geometry for the entire model
    const staticGeometries = [];
    mapModel.traverse((child) => {
        if (child.isMesh) {
                                    if (child.name.includes('platform')) {
                                        const worldScale = new THREE.Vector3();
                                        child.getWorldScale(worldScale);
                        
                                        child.geometry.computeBoundingBox();
                                        const box = child.geometry.boundingBox;
                                        
                                        // Calculate the center of the bounding box in local space
                                        const localCenter = new THREE.Vector3();
                                        box.getCenter(localCenter);
                                        
                                        const halfExtents = new CANNON.Vec3(
                                            ((box.max.x - box.min.x) / 2) * worldScale.x,
                                            ((box.max.y - box.min.y) / 2) * worldScale.y,
                                            ((box.max.z - box.min.z) / 2) * worldScale.z
                                        );
                                        const shape = new CANNON.Box(halfExtents);
                        
                                        // Set the shape's offset to the local center in world space
                                        const worldCenter = localCenter.clone();
                                        worldCenter.applyQuaternion(child.quaternion);
                                        worldCenter.multiply(worldScale);
                                        shape.position.set(worldCenter.x, worldCenter.y, worldCenter.z);
                        
                                        const body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
                                        body.addShape(shape);
                                        child.getWorldPosition(body.position);
                                        child.getWorldQuaternion(body.quaternion);
                                        world.addBody(body);
                                        platformBodies.push({ mesh: child, body: body });
                        
                                        const debugMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000, wireframe: true });
                                        const debugMesh = new THREE.Mesh(child.geometry, debugMaterial);
                                        debugMesh.scale.copy(worldScale); // Apply scale to debug mesh as well
                                        scene.add(debugMesh);
                                        debugMeshes.push({ mesh: debugMesh, body: body });
                                    } else {
                child.receiveShadow = true;
                // Ensure the world matrix is up-to-date
                child.updateWorldMatrix(true, true);
                const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
                staticGeometries.push(geometry);
            }
        }
    });

    if (staticGeometries.length > 0) {
        // Merge all geometries into one
        const mergedGeometry = THREE.BufferGeometryUtils.mergeBufferGeometries(staticGeometries, false);
        
        // Ensure the geometry has an index
        if (!mergedGeometry.index) {
            const indices = new Uint32Array(mergedGeometry.attributes.position.count);
            for (let i = 0; i < indices.length; i++) {
                indices[i] = i;
            }
            mergedGeometry.setIndex(new THREE.BufferAttribute(indices, 1));
        }

        // Extract vertices and indices for Cannon.js
        const vertices = Array.from(mergedGeometry.attributes.position.array);
        const indices = Array.from(mergedGeometry.index.array);

        const trimeshShape = new CANNON.Trimesh(vertices, indices);
        const mapBody = new CANNON.Body({ mass: 0 });
        mapBody.addShape(trimeshShape);
        
        // Position the physics body at the origin since vertices are in world space
        mapBody.position.set(0, 0, 0);
        mapBody.quaternion.set(0, 0, 0, 1);
        
        world.addBody(mapBody);
    }
    
    scene.add(mapModel);
});




// Create ball
let ball;
const loader = new THREE.GLTFLoader();
loader.load(
    '/models/monkeyberry.gltf',
    function (gltf) {
        ball = gltf.scene;
        ball.castShadow = true;
        ball.receiveShadow = true;
        scene.add(ball);

        // Set initial position
        ball.position.set(0, 5, 0);
        ballBody.position.copy(ball.position);
    },
    undefined,
    function (error) {
        console.error(error);
    }
);

const ballShape = new CANNON.Sphere(1);
const ballBody = new CANNON.Body({ mass: 1 });
ballBody.addShape(ballShape);
ballBody.position.set(0, 5, 0);
ballBody.linearDamping = 0.3;
ballBody.angularDamping = 0.3;
world.addBody(ballBody);

const debugMeshes = [];

// Create moving platform
const movingPlatform = {
    mesh: null,
    body: null,
    startPos: new THREE.Vector3(0, -95, -350),
    speed: .3,
    distance: 50
};

// Load GLTF model for the platform
const platformLoader = new THREE.GLTFLoader();
platformLoader.load('/models/platform.gltf', (gltf) => {
    movingPlatform.mesh = gltf.scene;
    movingPlatform.mesh.castShadow = true;
    movingPlatform.mesh.receiveShadow = true;
    movingPlatform.mesh.traverse((child) => {
        if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
        }
    });
    movingPlatform.mesh.position.copy(movingPlatform.startPos);
    scene.add(movingPlatform.mesh);
});

// Physics body for moving platform
const platformShape = new CANNON.Box(new CANNON.Vec3(10, 0.5, 10));
movingPlatform.body = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
movingPlatform.body.addShape(platformShape);
movingPlatform.body.position.set(
    movingPlatform.startPos.x,
    movingPlatform.startPos.y,
    movingPlatform.startPos.z
);
world.addBody(movingPlatform.body);

// Keyboard input
const keys = {
    w: false,
    a: false,
    s: false,
    d: false,
    ' ': false, // Spacebar for jump
    'r': false, // 'r' for reset
    'Shift': false
};

window.addEventListener('keydown', (e) => {
    if (e.key in keys) {
        keys[e.key] = true;
    }
});

window.addEventListener('keyup', (e) => {
    if (e.key in keys) {
        keys[e.key] = false;
    }
});

// Mouse input for camera orbit
let cameraOffset = new THREE.Vector3(0, 3, 8);
let cameraYaw = 0;
let cameraPitch = 0;

renderer.domElement.addEventListener('click', () => {
    renderer.domElement.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
    if (document.pointerLockElement === renderer.domElement) {
        document.addEventListener('mousemove', onMouseMove);
    } else {
        document.removeEventListener('mousemove', onMouseMove);
    }
});

function onMouseMove(event) {
    const movementX = event.movementX || 0;
    const movementY = event.movementY || 0;

    cameraYaw -= movementX * 0.002;
    cameraPitch -= movementY * 0.002;

    // Clamp vertical angle
    cameraPitch = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, cameraPitch));
}


// Handle window resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});


const clock = new THREE.Clock();
// Animation loop
function animate() {
    requestAnimationFrame(animate);
    const delta = clock.getDelta();

    for(const mixer of mixers) {
        mixer.update(delta);
    }

    // Update moving platform position
    const elapsed = clock.getElapsedTime();
    const movementX = Math.sin(elapsed * movingPlatform.speed) * movingPlatform.distance;
    movingPlatform.mesh.position.z = movingPlatform.startPos.z + movementX;
    movingPlatform.body.position.z = movingPlatform.startPos.z + movementX;

    for(const platform of platformBodies) {
        platform.mesh.getWorldPosition(platform.body.position);
        platform.mesh.getWorldQuaternion(platform.body.quaternion);
    }

    const baseSpeed = 15;
    const boostSpeed = 40;
    const isBoosting = keys.Shift;
    const speed = isBoosting ? boostSpeed : baseSpeed;
    const force = new CANNON.Vec3(0, 0, 0);

    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    const rightDirection = new THREE.Vector3().crossVectors(camera.up, cameraDirection).normalize();

    if (keys.w) {
        force.x += cameraDirection.x * speed;
        force.z += cameraDirection.z * speed;
    }
    if (keys.s) {
        force.x -= cameraDirection.x * speed;
        force.z -= cameraDirection.z * speed;
    }
    if (keys.a) {
        force.x += rightDirection.x * speed;
        force.z += rightDirection.z * speed;
    }
    if (keys.d) {
        force.x -= rightDirection.x * speed;
        force.z -= rightDirection.z * speed;
    }

    ballBody.applyForce(force, ballBody.position);

    // Jump logic
    const jumpForce = 20;
    let canJump = false;

    // Check for contact with the ground
    world.contacts.forEach(contact => {
        const isBallContact = contact.bi === ballBody || contact.bj === ballBody;
        if (isBallContact) {
            const contactNormal = new CANNON.Vec3();
            if (contact.bi === ballBody) {
                contact.ni.negate(contactNormal);
            } else {
                contactNormal.copy(contact.ni);
            }

            if (contactNormal.y > 0.5) {
                canJump = true;
            }
        }
    });

    if (keys[' '] && canJump) {
        ballBody.velocity.y = jumpForce;
    }


    // Step physics world
    world.step(delta);

    // Update ball position and rotation
    if (ball) {
        ball.position.copy(ballBody.position);
        ball.quaternion.copy(ballBody.quaternion);
        
        // Update camera to follow and orbit ball
        const euler = new THREE.Euler(cameraPitch, cameraYaw, 0, 'YXZ');
        const rotation = new THREE.Quaternion().setFromEuler(euler);

        const desiredOffset = cameraOffset.clone().applyQuaternion(rotation);
        const desiredCameraPosition = new THREE.Vector3().copy(ball.position).add(desiredOffset);
        
        camera.position.copy(desiredCameraPosition);
        camera.lookAt(ball.position);

        // Reset ball if it falls too far
        if (ball.position.y < -150) {
            ball.position.set(0, 10, 0);
            ballBody.position.copy(ball.position);
            ballBody.velocity.set(0, 0, 0);
            ballBody.angularVelocity.set(0, 0, 0);
        }

        // Reset ball with 'r' key
        if (keys.r) {
            ball.position.set(0, 10, 0);
            ballBody.position.copy(ball.position);
            ballBody.velocity.set(0, 0, 0);
            ballBody.angularVelocity.set(0, 0, 0);
            keys.r = false; // Reset the key state to prevent continuous resetting
        }
    }

    // Update info box
    velocityElement.textContent = ballBody.velocity.length().toFixed(2);
    positionElement.textContent = `x:${ballBody.position.x.toFixed(2)}, y:${ballBody.position.y.toFixed(2)}, z:${ballBody.position.z.toFixed(2)}`;

    for(const debug of debugMeshes) {
        debug.mesh.position.copy(debug.body.position);
        debug.mesh.quaternion.copy(debug.body.quaternion);
    }

    // Render scene
    renderer.render(scene, camera);
}

document.getElementById('startButton').addEventListener('click', () => {
    const titleScreen = document.getElementById('title-screen');
    if (titleScreen) {
        titleScreen.remove();
    }
    // The game's canvas is the first one, but let's be more specific if possible.
    // The renderer is appended to the body, so it's one of the last children.
    const gameCanvas = document.querySelector('body > canvas');
    if(gameCanvas) {
        gameCanvas.style.display = 'block';
    }
    document.getElementById('info-box').style.display = 'block';
    animate();
});
