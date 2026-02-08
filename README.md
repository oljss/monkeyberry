# Monkeyberry

[![NPM Version][npm-image]][npm-url]
[![Build Status][build-image]][build-url]
[![Test Coverage][coverage-image]][coverage-url]

Fast, unopinionated, minimalist web framework for [Node.js](http://nodejs.org), built upon Express.

## Installation

This is a [Node.js](https://nodejs.org/en/) module. Before installing, [download and install Node.js](https://nodejs.org/en/download/).

Installation is done using the [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ git clone https://github.com/your-username/monkeyberry.git
$ cd monkeyberry
$ npm install
```

## Quick Start

The quickest way to get started is to use the following snippet:

```javascript
const express = require('express');
const app = express();
const port = 3000;

app.get('/', (req, res) => {
  res.send('Hello World from Monkeyberry!');
});

app.listen(port, () => {
  console.log(`Monkeyberry app listening at http://localhost:${port}`);
});
```

## Running Your Application

Start the server with the `npm start` command.

```sh
$ npm start
```

View the website at: http://localhost:3000

## Running Tests

To run the test suite, first install the dependencies, then run `npm test`:

```sh
$ npm install
$ npm test
```

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## License

MIT

[npm-image]: https://img.shields.io/npm/v/monkeyberry.svg
[npm-url]: https://npmjs.org/package/monkeyberry
[build-image]: https://img.shields.io/travis/your-username/monkeyberry.svg
[build-url]: https://travis-ci.org/your-username/monkeyberry
[coverage-image]: https://img.shields.io/coveralls/your-username/monkeyberry.svg
[coverage-url]: https://coveralls.io/r/your-username/monkeyberry