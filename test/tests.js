var assert = require('assert');
var nodefetch = require('../nodefetch');
var shell = require('shelljs');
var url = require('url');
var MTW = require('minitestwrap');

//make sure tests are run from within the test dir so the testdls folder goes in the right place
MTW.beforeAll(function() {
  var pwd = url.parse(shell.pwd()).pathname.split("/").pop();
  if(pwd == "nodefetch") {
    shell.cd("test");
  }
  //use a scrap folder for all the test DLs
  shell.rm("-rf", "testdls");
  shell.mkdir("testdls");
  shell.cd("testdls");

  nodefetch.userHome = function() {
    return ".";
  }
});

MTW.addTest("getSettings", function() {
  assert.equal(nodefetch.settingsFileExists(), false);
  nodefetch.getSettingsFile(function() {
    assert.equal(nodefetch.settingsFileExists(), true);
  });
});


MTW.addTest("readPackagesFromSettings", function() {
  nodefetch.getSettingsFile(function() {
    assert.equal(nodefetch.settingsFileExists(), true);
    var packages = nodefetch.readPackagesFromSettings();
    assert.equal(packages['jquery'], 'http://code.jquery.com/jquery.min.js');
    assert.equal(packages['reset'], 'http://meyerweb.com/eric/tools/css/reset/reset.css');
  });
});

MTW.addTest("updateSettings", function() {
  nodefetch.getSettingsFile(function() {
    var packages = nodefetch.readPackagesFromSettings();
    nodefetch.updateSettings();
    assert.deepEqual(nodefetch.packages, {});
    packages = nodefetch.readPackagesFromSettings();
    assert.notEqual(nodefetch.packages, {});
  });
});

MTW.addTest("processArguments", function() {
  nodefetch.getSettingsFile(function() {
    nodefetch.readPackagesFromSettings();
    assert.equal(nodefetch.parsePackageArgument("jquery").url, "http://code.jquery.com/jquery.min.js");
    assert.equal(nodefetch.parsePackageArgument("jquery").output, "jquery.min.js");
    assert.equal(nodefetch.parsePackageArgument("backbone:b.js").output, "b.js");
    assert.throws(function() {
      nodefetch.parsePackageArgument("doesntexist");
    }, Error);
  });
});

MTW.addTest("getFile", function() {
  nodefetch.getSettingsFile(function() {
    nodefetch.readPackagesFromSettings();
    var parsed = nodefetch.parsePackageArgument("jquery:test-download.js");
    nodefetch.getFile(parsed.url, parsed.output, function() {
      assert.ok(shell.test("-f", parsed.output));
    });
    var parsed2 = nodefetch.parsePackageArgument("jquery");
    nodefetch.getFile(parsed2.url, parsed2.output, function() {
      assert.ok(shell.test("-f", parsed2.output));
    });
    var parsed3 = nodefetch.parsePackageArgument("bootstrap");
    nodefetch.getFile(parsed3.url, parsed3.output, function() {
      nodefetch.extractZip(parsed3.output, function() {
        assert.ok(shell.test("-d", parsed3.output.split(".")[0]));
      });
    });
  });
});


MTW.beforeEach(function() {
  shell.test("-f", ".nodefetch.json") && shell.rm(".nodefetch.json");
});


MTW.run();
