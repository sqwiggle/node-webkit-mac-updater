# Node Webkit Updater

This package will update a deployed Mac application by downloading a dmg from a specific location, mounting it, copying the contents over the original (keeping code signatures) and cleaning up after itself.

## Installation

You'll want to install the latest stable package from NPM:

```js
npm install node-webkit-mac-updater
```

## Usage

It's upto your application to know whether an update is needed and where to find it. You can do this by periodically hitting an API endpoint under your control. Once you know an update is needed then simply let the updater know where to find the dmg. 

This gives you the oppertunity to ask the user if they wish to update or force an update in the background.

```js
var Updater = require('node-webkit-mac-updater');

var updater = new Updater({
    dmg_name: 'MyApp Installer',
    app_name: 'MyApp',
    source: {
        host: 's3.amazonaws.com',
        port: 80,
        path: '/myapp-releases/mac/app-0.2.dmg'
    }
});

updater.update(function(err){
    if (!err) console.log('App has been updated!');
});

```


## DMG Format

The DMG must be built so that MyApp.app is in the root of the folder structure. You may have other files in the archive but only MyApp.app will be copied. This tool works great for creating DMGs programatically:

https://github.com/sqwiggle/yoursway-create-dmg


## Future Development

In the future we will be developing this into a cross-platform updater, covering the quirks and formats required for each individual OS that node-webkit supports.
