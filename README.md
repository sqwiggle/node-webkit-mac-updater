# node-webkit-mac-updater

This package will update a deployed Mac application by downloading a dmg from a specific location, mounting it, copying the contents over the original (keeping code signatures) and cleaning up after itself.

## Usage

```js
var Updater = require('node-webkit-mac-updater');

var updater = new Updater({
    dmg_name: 'Sqwiggle Installer',
    app_name: 'Sqwiggle',
    source: {
        host: 's3.amazonaws.com',
        port: 80,
        path: '/sqwiggle-releases/mac/sqwiggle-0.2.dmg'
    }
});

updater.update(function(err){
    if (!err) console.log('App has been updated!');
});

```
