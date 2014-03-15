var fs = require('fs');
var path = require('path');
var _ = require('underscore');
var execPath = process.execPath;
var filePath = execPath.substr(0, execPath.lastIndexOf("\\"));
var appPath = path.normalize(execPath + "/../../../../../../..");
var tempName = 'update.dmg';
var exec = require('child_process').exec;
var mount_point;

module.exports = Updater;

function Updater(config) {
    this.config = _.extend(this.config, config || {}); 
};


Updater.prototype = {
    
    // public
    config: {
        dmg_name: 'Sqwiggle Installer',
        app: 'Sqwiggle',
        filename: 'sqwiggle-{{version}}.dmg',
        source: {
            host: 's3.amazonaws.com',
            port: 443,
            path: '/sqwiggle-releases/mac/'
        }
    },
    
    update: function(version, callback) {
        
    },
    
    
    // private
    download: function(filename, callback) {
        
        var http = require('https');
        var options = _.clone(config.source);
        options.path = options.path + filename;
        
        // download file and call 'callback' when complete
        var request = https.get(options, function(res){
            res.setEncoding('binary');
            
            var data = '';
            var rln=0,ln=res.headers['content-length'];
            
            res.on('data', function(chunk){
                rln += chunk.length;
                data += chunk;
            });
             
            res.on('end', function(){
                callback(data);
            });
        });
    },
    
    mount: function(dmg, callback) {
        exec('hdiutil attach ' + dmg + ' -nobrowse', callback);
    },
    
    unmount: function(mount_point, callback) {
        exec('hdiutil detach ' + mount_point, callback);
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
    
    moveOriginal: function(app, callback) {
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
            fs.readdirSync(path).forEach(function(file,index){
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