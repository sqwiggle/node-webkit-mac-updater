var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var exec = require('child_process').exec;
var execPath = process.execPath;
var filePath = execPath.substr(0, execPath.lastIndexOf("\\"));
var appPath = path.normalize(execPath + "/../../../../../../..");
var escapeshell = function(cmd) {
  return '"'+cmd.replace(/(["'$`\\])/g,'\\$1')+'"';
};

module.exports = Updater;

function Updater(config) {
    this.config = _.extend(this.config, config || {}); 
}

Updater.prototype = {
    
    // public
    config: {
        dmg_name: 'Myapp Installer',
        app: 'Myapp',
        source: {
            host: 's3.amazonaws.com',
            port: 443,
            path: '/myapp-releases/mac/myapp.dmg'
        },
        progress: function(percentage) {
            console.log(percentage + "%");
        }
    },
    
    update: function(callback) {
        console.log('downloading ' + this.config.source.path);
        
        var tempName = '.nw-update.dmg';
        var location = appPath+ "/" +tempName;
        var self = this;
        
        try {
            this.download(this.config.source, location, function(){
                console.log('downloaded');
            
                self.mount(location, self.config.dmg_name, function(mount_point){
                    console.log('update mounted at ' + mount_point);
                
                    self.hideOriginal(self.config.app, function(err){
                        if (err) throw err;
                        console.log('original application hidden');
                    
                        self.copyUpdate(self.config.app, mount_point, appPath, function(err){
                            if (err) throw err;
                        
                            console.log('update applied successfully, cleaning up');
                        
                            // if either of these fails we're still going to call it a (messy) success
                            self.cleanup(location);
                            self.detach(mount_point, function(){
                                
                                console.log('update complete');
                                callback(); 
                            });
                        });
                    }); 
                });
            }, this.config.progress);
        } catch (err) {
            
            // in the event of an error, cleanup what we can
            this.cleanup(location);
            callback(err);
        }
    },
    
    
    // private
    download: function(options, location, callback, progress) {
        
        var http = require('http');
        var request = http.get(options, function(res){
            res.setEncoding('binary');
            
            var data = '';
            var rln=0,percent=0,ln=res.headers['content-length'];
            
            res.on('data', function(chunk){
                rln += chunk.length;
                data += chunk;
                
                var p = Math.round((rln/ln)*100);
                if (p > percent) { 
                    percent = p;
                    progress(p);
                }
            });
             
            res.on('end', function(){
                fs.writeFile(location, data, 'binary', callback);
            });
        });
    },
    
    mount: function(dmg, dmg_name, callback) {
        var self = this;
        
        exec('hdiutil attach ' + dmg + ' -nobrowse', function(err){
            if (err) throw err;
            console.log('mounted volume');
            
            self.findMountPoint(dmg_name, callback);
        });
    },
    
    detach: function(mount_point, callback) {
        exec('hdiutil detach ' + escapeshell(mount_point), callback);
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
        exec('cp -R ' + escapeshell(from + '/' + filename) + ' ' + escapeshell(to), callback);
    },
    
    hideOriginal: function(app, callback) {
        var filename = app + '.app';
        fs.rename(appPath + '/' + filename, appPath + '/.' + filename, callback);
    },
    
    restore: function() {
        // TODO: restore previous state of application
    },
    
    cleanup: function(location) {
        // TODO: remove this closely coupled code
        // remove downloaded dmg
        this.deleteFile(location);
        
        // remove old version of application
        this.deleteFolder(appPath + "/."+ this.config.app +".app");
    },
    
    deleteFile: function(path) {
        if (fs.existsSync(path)) {
            fs.unlinkSync(path);
        }
    },
    
    deleteFolder: function(path) {
        var self = this;
        
        if (fs.existsSync(path)) {
            fs.readdirSync(path).forEach(function(file, index){
                var curPath = path + "/" + file;
            
                if(fs.statSync(curPath).isDirectory()) { // recurse
                    self.deleteFolder(curPath);
                } else { // delete file
                    fs.unlinkSync(curPath);
                }
            });
            
            fs.rmdirSync(path);
        }
    }
};