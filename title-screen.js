// Ensure Three.js and GLTFLoader are loaded before this script
if (typeof THREE === 'undefined' || typeof THREE.GLTFLoader === 'undefined') {
    console.error("Three.js or GLTFLoader is not loaded.");
} else {
    const container = document.getElementById('model-container');

    if (container) {
        // Scene
        const scene = new THREE.Scene();
        

        // Camera
        const camera = new THREE.PerspectiveCamera(20, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera.position.set(0, 0, 20);

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setClearColor( 0x000000, 0 ); // the default
        renderer.setSize(container.clientWidth, container.clientHeight);
        container.appendChild(renderer.domElement);

        // Light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 10, 7.5);
        scene.add(directionalLight);

        // Load Model
        const loader = new THREE.GLTFLoader();
        let model;
        loader.load(
            '/models/monkeyberry.gltf',
            function (gltf) {
                model = gltf.scene;
                // Center the model
                const box = new THREE.Box3().setFromObject(model);
                const center = box.getCenter(new THREE.Vector3());
                model.position.sub(center); 
                
                model.scale.set(2.5, 2.5, 2.5);
                scene.add(model);
            },
            undefined,
            function (error) {
                console.error('An error happened while loading the model:', error);
            }
        );

        // Mouse tracking - object follows cursor
        let mousePosition = { x: 0, y: 0 };
        let targetRotation = { x: 0, y: 0 };
        const rotationLerpFactor = 0.1; // Smoothness of rotation (0-1, lower = smoother)

        renderer.domElement.addEventListener('mousemove', (e) => {
            // Normalize mouse position to -1 to 1 range
            mousePosition.x = (e.clientX / container.clientWidth) * 2 - 1;
            mousePosition.y = -(e.clientY / container.clientHeight) * 2 + 1;

            // Calculate target rotation based on cursor position
            targetRotation.y = mousePosition.x * Math.PI * 0.5; // -90° to +90° on Y axis
            targetRotation.x = -mousePosition.y * Math.PI * 0.3; // -54° to +54° on X axis
        });

        renderer.domElement.addEventListener('mouseleave', () => {
            // Smoothly return to neutral position when cursor leaves
            targetRotation.x = 0;
            targetRotation.y = 0;
        });

        // Animation loop
        function animateTitle() {
            requestAnimationFrame(animateTitle);

            if (model) {
                // Smoothly interpolate (lerp) current rotation to target rotation
                model.rotation.x += (targetRotation.x - model.rotation.x) * rotationLerpFactor;
                model.rotation.y += (targetRotation.y - model.rotation.y) * rotationLerpFactor;
            }

            renderer.render(scene, camera);
        }
        
        // Handle window resize
        window.addEventListener('resize', () => {
            if (container) {
                camera.aspect = container.clientWidth / container.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(container.clientWidth, container.clientHeight);
            }
        });

        animateTitle();
    }
}
