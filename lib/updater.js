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
        app_name: 'Myapp',
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
                
                    self.hideOriginal(self.config.app_name, function(err){
                        if (err) throw err;
                        console.log('original application hidden');
                    
                        self.copyUpdate(self.config.app_name, mount_point, appPath, function(err, app){
                            if (err) throw err;
                            console.log('update applied successfully at ', app);
                            
                            self.removeQuarantine(app, function(err){
                                if (err) throw err;
                                console.log('quarantine removed, cleaning up');
                            });
                            
                            // if either of these fails we're still going to call it a (messy) success
                            self.cleanup(location);
                            self.unmount(mount_point, function(){
                            
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
        
        exec('hdiutil attach ' + escapeshell(dmg) + ' -nobrowse', function(err){
            if (err) throw err;
            console.log('mounted volume');
            
            self.findMountPoint(dmg_name, callback);
        });
    },
    
    unmount: function(mount_point, callback) {
        exec('hdiutil detach ' + escapeshell(mount_point), callback);
    },
    
    findMountPoint: function(dmg_name, callback) {
       var plist = require('plist-with-patches');
        exec('hdiutil info -plist', function(err, stdout) {
            if (err) throw err;

            var results = plist.parseStringSync(stdout);
            var images = results.images;
            
            if(images) {
                for (var i=0,l=images.length;i<l;i++) {
               
                var ents = images[i]['system-entities'];

                var mp = _.find(ents, function(ent) {
                    if(_.has(ent, 'mount-point') && ent['mount-point'].match(dmg_name)) {
                        return ent['mount-point'];
                    }
                });
                console.log('Mount Point Found');
                if(mp) {
                    callback(mp['mount-point']);
                    return;
                }               
                }
            }
            throw "Mount point not found";
        });
    },
    
    copyUpdate: function(app, from, to, callback) {
        exec('cp -R ' + escapeshell(from + '/' + app + '.app') + ' ' + escapeshell(to), function(err){
            callback(err, to + '/' + app + '.app');
        });
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
        this.deleteFolder(appPath + "/."+ this.config.app_name +".app");
    },
    
    removeQuarantine: function(directory, callback) {
        exec('xattr -rd com.apple.quarantine ' + escapeshell(directory), callback);
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
