#! /usr/bin/env node

//some dependencies
var url = require('url');
var fs = require('fs');
var request = require('request');
var unzip = require('unzip');
var shell = require('shelljs');
var isTest = false;

//terminal output colours!
//via http://roguejs.com/2011-11-30/console-colors-in-node-js/
var red, green, reset;
red   = '\033[31m';
green = '\033[32m';
reset = '\033[0m';


var nodefetch = {
  VERSION: "0.2.0",
  packages: {},
  userHome: function() {
    return process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
  },
  settingsFileExists: function() {
    try {
      fs.lstatSync(this.userHome() + '/.nodefetch.json');
    } catch(e) {
      return false;
    }
    return true;
  },
  getSettingsFile: function(cb) {
    if(this.settingsFileExists()) {
      if(!isTest) console.log("-> " + green + "Settings file found", reset);
      (cb && typeof cb == "function" && cb());
      return;
    }
    var url = "http://jackfranklin.org/nodefetch.json";
    if(!isTest) console.log("-> " + red + "No settings file detected.", reset, "Downloading default from " + url);
    this.getFile(url, this.userHome() + "/.nodefetch.json", function() {
      (cb && typeof cb == "function" && cb());
    });
  },
  readPackagesFromSettings: function() {
    if(Object.keys(this.packages).length > 0) return this.packages;
    try {
      this.packages = JSON.parse(fs.readFileSync(this.userHome() + '/.nodefetch.json').toString());
    } catch (e) {
      throw new Error("Invalid JSON");
    }
    return this.packages;
  },
  updateSettings: function() { this.packages = {}; },
  processUserArgs: function() {
    var userArgs = process.argv.slice(2); //remove first two to get at the user commands
    for(var i = 0; i < userArgs.length; i++) {
      var argResponse = this.parsePackageArgument(userArgs[i])
      this.getFile(argResponse.url, argResponse.output);
    }
  },
  parsePackageArgument: function(arg) {
    var args = arg.split(":");
    var fileUrl = this.packages[args[0]];
    if(!fileUrl) {
      throw new Error(red + " ERROR " + args[0] + " does not exist" + reset);
    }
    return {
      url: fileUrl,
      output: args[1] || url.parse(fileUrl).pathname.split('/').pop()
    };
  },
  getFile: function(fileUrl, output, cb) {
    var self = this;
    var splitUrl = fileUrl.split(".");
    var isZip = !!(splitUrl[splitUrl.length-1] === "zip");
    var requestOpts;
    if(isZip) {
      requestOpts = {
        uri: fileUrl,
        encoding: null
      };
    } else {
      requestOpts = fileUrl;
    }
    request(requestOpts).pipe(fs.createWriteStream(output).on("close", function() {
      if(!isTest) console.log("-> " + green + "SUCCESS: " + fileUrl + " has been written to " + output, reset);
      if(isZip && !isTest) {
        self.extractZip(output, cb);
      } else {
        (cb && typeof cb == "function" && cb());
      }
    }));
  },
  extractZip: function(fileName, cb) {
    var output = fileName.split(".")[0];
    fs.createReadStream(fileName).pipe(unzip.Extract({ path: './' })).on("close", function() {
      shell.rm(fileName);
      if(!isTest) console.log("-> " + green + "SUCCESS: " + fileName + " has been unzipped to /" + output, reset);
      (cb && typeof cb == "function" && cb());
    });
  }
};

//help
if(process.argv[2] == "--help") {
  console.log("-> VERSION", nodefetch.VERSION);
  console.log("-> nodefetch help");
  console.log("-> To upgrade to latest version: npm update nodefetch -g");
  console.log("");
  console.log("-> USAGE: 'nodefetch package_name [file_name]'");
  console.log("");
  console.log("-> BASIC USAGE");
  console.log("---> when you first run nodefetch, a package.json file will be downloaded to ~/.nodefetch.json.");
  console.log("---> This file contains a list of packages, which you can edit as you please");
  console.log("---> once you have this package.json, to install a library, type 'nodefetch' followed by the library name.");
  console.log("---> for example: 'nodefetch jquery' will install the latest jQuery");
  console.log("---> download multiple libraries at once: 'nodefetch jquery backbone underscore'");
  console.log("");
  console.log("-> FURTHER OPTIONS");
  console.log("---> if you want to store the library to different filename than the one that it's called on the server");
  console.log("---> you can pass in an optional filename with the library name, colon separated");
  console.log("---> for example, 'nodefetch jquery:foo.js' will download jQuery into foo.js");
  console.log("---> 'nodefetch jquery:foo.js backbone underscore:u.js' downloads jQuery to foo.js, Backbone to default and Underscore to u.js");
  console.log("");
  console.log("-> any feedback, help or issues, please report them on Github: https://github.com/jackfranklin/nodefetch/");
  console.log("");
  process.exit(1);
}


//check if we are in test mode
if(!(process.argv[1].indexOf("nodefetch/test/tests") > -1)) {
  nodefetch.getSettingsFile(function() {
    nodefetch.readPackagesFromSettings();
    nodefetch.processUserArgs();
  });
} else {
  isTest = true;
}

//expose (mainly for testing)
module.exports = nodefetch;

/*
 * TODO: check on Windows
 */
