# node-webkit-mac-updater

This package will update a deployed Mac application by downloading a dmg from a specific location, mounting it, copying the contents over the original (keeping code signatures) and cleaning up after itself.

## Usage

```
var version = 0.2;
var Updater = require('node-webkit-mac-updater');

var updater = new Updater({
    dmg_name: 'Sqwiggle Installer',
    app: 'Sqwiggle',
    source: {
        host: 's3.amazonaws.com',
        port: 443,
        path: '/sqwiggle-releases/mac/sqwiggle-0.2.dmg'
    }
});

updater.update(function(){
    console.log('app has been updated!');
});

```