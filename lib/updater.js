var fs = require('fs');
var path = require('path');
var _ = require('underscore');

module.exports = Updater;


function Updater(config) {
    this.config = _.extend(this.config, config || {}); 
};


Updater.prototype = {
    
    // public
    config: {
        dmg_name: 'Myapp Installer',
        app: 'Myapp',
        source: {
            host: 's3.amazonaws.com',
            port: 443,
            path: '/myapp-releases/mac/myapp.dmg'
        }
    },
    
    update: function(callback) {
        console.log('downloading ' + this.config.source.path);
        
        var execPath = process.execPath;
        var filePath = execPath.substr(0, execPath.lastIndexOf("\\"));
        var appPath = path.normalize(execPath + "/../../../../../../..");
        var tempName = 'nw-update.dmg';
        var exec = require('child_process').exec;
        var location = appPath+ "/" +tempName;
        var self = this;
        
        this.download(this.config, location, function(){
            console.log('downloaded');
            
            self.mount(location, self.config.dmg_name, function(mount_point){
                console.log('update mounted at ' + mount_point);
                
                self.hideOriginal(function(self.config.app){
                    console.log('original application hidden');
                    
                    self.copyUpdate(self.config.app, dmg, appPath, function(){
                        console.log('update copied successfully, cleaning up');
                        
                        // if either of these fails we're still going to call it a (messy) success
                        self.cleanup();
                        self.unmount();
                        callback();
                    });
                }); 
            });
        });
    },
    
    
    // private
    download: function(options, location, callback) {
        
        var https = require('https');
        var request = https.get(options, function(res){
            res.setEncoding('binary');
            
            var data = '';
            var rln=0,ln=res.headers['content-length'];
            
            res.on('data', function(chunk){
                rln += chunk.length;
                data += chunk;
            });
             
            res.on('end', function(){
                fs.writeFile(location, data, 'binary', callback);
            });
        });
    },
    
    mount: function(dmg, dmg_name callback) {
        var self = this;
        
        exec('hdiutil attach ' + dmg + ' -nobrowse', function(err){
            if (err) throw err;
            self.findMountPoint(dmg_name, callback);
        });
    },
    
    unmount: function(mount_point, callback) {
        exec('hdiutil detach ' + mount_point, function(err){
            if (err) throw err;
            if (callback) callback();
        });
    },
    
    findMountPoint: function(dmg_name, callback) {
        exec('hdiutil info', function(err, stdout){
            if (err) throw err;
            
            var results = stdout.split("\n");
            
            for (var i=0,l=results.length;i<l;i++) {
                if (results[i].match(dmg_name)) {
                    callback(results[i].split("\t").pop());
                    return;
                }
            }
            
            throw "Mount point not found";
        });
    },
    
    copyUpdate: function(app, from, to, callback) {
        var filename = app + '.app';
        exec('cp -R ' + from + '/' + filename + ' ' + to, callback);
    },
    
    hideOriginal: function(app, callback) {
        var filename = app + '.app';
        exec('mv ' + appPath + '/' + filename + ' ' + appPath + '/.' + filename, callback);
    },
    
    cleanup: function() {
        // remove temporary downloaded dmg
        var location = appPath+"/"+tempName;
        fs.exists(location, function (exists) {
            if (exists) fs.unlinkSync(location);
        });
        
        // remove old version of application
        this.deleteFolderRecursive(appPath + "/."+ this.config.app +".app");
    },
    
    deleteFolderRecursive: function(path) {
        var self = this;
        
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index){
            var curPath = path + "/" + file;
            
            if(fs.statSync(curPath).isDirectory()) { // recurse
                self.deleteFolderRecursive(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        
        fs.rmdirSync(path);
    }
};