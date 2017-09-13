'use strict';

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var async = require('async');
var path = require('path');
var fs = require('fs');
var _ = require('lodash');

var Options = require('./Options');
var Release = require('./Release');
var Remote = require('./Remote');
var Archiver = require('./Archiver');

var logger = require('./logger');
var utils = require('./utils');

module.exports = function () {
    function _class(options) {
        var _this = this;

        _classCallCheck(this, _class);

        this.options = new Options(options).get();

        this.release = new Release(this.options, Options.defaultOptions());

        this.remote = new Remote(this.options);

        this.logger = logger;
        this.logger.setDebug(this.options.debug);

        this.context = {
            options: this.options,
            release: this.release,
            logger: this.logger,
            remote: {
                exec: function exec(command, done, showLog) {
                    _this.remote.exec(command, done, showLog);
                },
                execMultiple: function execMultiple(commands, done, showLog) {
                    _this.remote.execMultiple(commands, done, showLog);
                },
                upload: function upload(src, target, done) {
                    _this.remote.upload(src, target, done);
                },
                createSymboliclink: function createSymboliclink(target, link, done) {
                    _this.remote.createSymboliclink(target, link, done);
                },
                chmod: function chmod(path, mode, done) {
                    _this.remote.chmod(path, mode, done);
                },
                createFolder: function createFolder(path, done) {
                    _this.remote.createFolder(path, done);
                }
            },

            // 1.x.x compatibility
            // @deprecated
            releaseTag: this.release.tag,
            // @deprecated
            releaseName: this.release.name,
            // @deprecated
            execRemote: function execRemote(cmd, showLog, done) {
                _this.remote.exec(cmd, done, showLog);
            }
        };
    }

    _createClass(_class, [{
        key: 'noop',
        value: function noop() {}
        // Nothing


        /**
         * Deploy release
         */

    }, {
        key: 'deployRelease',
        value: function deployRelease(done) {
            done = done || this.noop;

            async.series([this.connectToRemoteTask.bind(this), this.onBeforeDeployTask.bind(this), this.onBeforeDeployExecuteTask.bind(this), this.compressReleaseTask.bind(this), this.createReleaseFolderOnRemoteTask.bind(this), this.uploadArchiveTask.bind(this), this.uploadReleaseTask.bind(this), this.decompressArchiveOnRemoteTask.bind(this), this.onBeforeLinkTask.bind(this), this.onBeforeLinkExecuteTask.bind(this), this.updateSharedSymbolicLinkOnRemoteTask.bind(this), this.createFolderTask.bind(this), this.makeDirectoriesWritableTask.bind(this), this.makeFilesExecutableTask.bind(this), this.updateCurrentSymbolicLinkOnRemoteTask.bind(this), this.onAfterDeployTask.bind(this), this.onAfterDeployExecuteTask.bind(this), this.remoteCleanupTask.bind(this), this.deleteLocalArchiveTask.bind(this), this.closeConnectionTask.bind(this)], function () {
                done();
            });
        }

        /**
         * Remove release
         */

    }, {
        key: 'removeRelease',
        value: function removeRelease(done) {
            done = done || this.noop;

            async.series([this.connectToRemoteTask.bind(this), this.removeReleaseTask.bind(this), this.closeConnectionTask.bind(this)], function () {
                done();
            });
        }

        // =======================================================================================

        /**
         * @param done
         */

    }, {
        key: 'onBeforeDeployTask',
        value: function onBeforeDeployTask(done) {
            this.options.onBeforeDeploy(this.context, done);
        }

        /**
         * @param done
         */

    }, {
        key: 'onBeforeDeployExecuteTask',
        value: function onBeforeDeployExecuteTask(done) {
            this.middlewareCallbackExecute(this.options.onBeforeDeployExecute, done);
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'compressReleaseTask',
        value: function compressReleaseTask(done) {

            if (this.options.mode != 'archive') {
                done();
                return;
            }

            logger.subhead('Compress release');
            var spinner = logger.startSpinner('Compressing');

            var archiver = this.createArchiver(this.options.archiveType, this.options.archiveName, this.options.localPath, this.options.exclude);

            archiver.compress(function (fileSize) {
                spinner.stop();
                logger.ok('Archive created : ' + fileSize);
                done();
            }, function (err) {
                spinner.stop();
                logger.error('Error while compressing');
                throw err;
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'connectToRemoteTask',
        value: function connectToRemoteTask(done) {
            var _this2 = this;

            this.logger.subhead('Connect to ' + this.options.host);
            var spinner = this.logger.startSpinner('Connecting');

            this.remote = this.createRemote(this.options, this.logger, function (command, error) {
                console.log(command);
                _this2.logger.error('Connection error', command, error);

                // Clean up remote release + close connection
                //    this.removeReleaseTask(this.closeConnectionTask(done));
            });

            this.remote.connect(
            // Success
            function () {
                spinner.stop();
                _this2.logger.ok('Connected');
                done();
            },
            // Error
            function (error) {
                spinner.stop();
                if (error) {
                    _this2.logger.fatal(error);
                }
            },
            // Close
            function () {
                _this2.logger.subhead("Closed from " + _this2.options.host);
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'createReleaseFolderOnRemoteTask',
        value: function createReleaseFolderOnRemoteTask(done) {
            var _this3 = this;

            this.logger.subhead('Create release folder on remote');
            this.logger.log(' - ' + this.release.path);

            this.remote.createFolder(this.release.path, function () {
                _this3.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'uploadArchiveTask',
        value: function uploadArchiveTask(done) {
            var _this4 = this;

            if (this.options.mode != 'archive') {
                done();
                return;
            }

            this.logger.subhead('Upload archive to remote');
            var spinner = this.logger.startSpinner('Uploading');

            this.remote.upload(this.options.archiveName, this.release.path, function (error) {
                spinner.stop();

                if (error) {
                    logger.error(error);
                    return;
                }

                _this4.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'uploadReleaseTask',
        value: function uploadReleaseTask(done) {
            var _this5 = this;

            if (this.options.mode != 'synchronize') {
                done();
                return;
            }

            this.logger.subhead('Synchronize remote server');
            var spinner = this.logger.startSpinner('Synchronizing');

            this.remote.synchronize(this.options.localPath, this.release.path, this.options.deployPath + '/' + this.options.synchronizedFolder, function () {
                spinner.stop();
                _this5.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'decompressArchiveOnRemoteTask',
        value: function decompressArchiveOnRemoteTask(done) {
            var _this6 = this;

            if (this.options.mode != 'archive') {
                done();
                return;
            }

            this.logger.subhead('Decompress archive on remote');
            var spinner = this.logger.startSpinner('Decompressing');

            var archivePath = path.posix.join(this.release.path, this.options.archiveName);
            var untarMap = {
                'zip': "unzip -q " + archivePath + " -d " + this.release.path + "/",
                'tar': "tar -xvf " + archivePath + " -C " + this.release.path + "/"
            };

            // Check archiveType is supported
            if (!untarMap[this.options.archiveType]) {
                logger.fatal(this.options.archiveType + ' not supported.');
            }

            var command = [untarMap[this.options.archiveType], "rm " + archivePath].join('\n');

            this.remote.exec(command, function () {
                spinner.stop();
                _this6.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'onBeforeLinkTask',
        value: function onBeforeLinkTask(done) {
            this.options.onBeforeLink(this.context, done);
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'onBeforeLinkExecuteTask',
        value: function onBeforeLinkExecuteTask(done) {
            this.middlewareCallbackExecute(this.options.onBeforeLinkExecute, done);
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'updateSharedSymbolicLinkOnRemoteTask',
        value: function updateSharedSymbolicLinkOnRemoteTask(done) {
            var _this7 = this;

            if (!this.options.share || this.options.share.length == 0) {
                done();
                return;
            }

            this.logger.subhead('Update shared symlink on remote');

            async.eachSeries(Object.keys(this.options.share), function (currentSharedFolder, itemDone) {
                var configValue = _this7.options.share[currentSharedFolder];
                var symlinkName = configValue;
                var mode = null;

                if ((typeof configValue === 'undefined' ? 'undefined' : _typeof(configValue)) == 'object' && 'symlink' in configValue) {
                    symlinkName = configValue.symlink;
                }

                if ((typeof configValue === 'undefined' ? 'undefined' : _typeof(configValue)) == 'object' && 'mode' in configValue) {
                    mode = configValue.mode;
                }

                var linkPath = _this7.release.path + '/' + symlinkName;
                var upwardPath = utils.getReversePath(symlinkName);
                var target = upwardPath + '/../' + _this7.options.sharedFolder + '/' + currentSharedFolder;

                _this7.logger.log(' - ' + symlinkName + ' ==> ' + currentSharedFolder);
                _this7.remote.createSymboliclink(target, linkPath, function () {
                    if (!mode) {
                        itemDone();
                        return;
                    }

                    _this7.logger.log('   chmod ' + mode);
                    _this7.remote.chmod(linkPath, mode, function () {
                        itemDone();
                    });
                });
            }, function () {
                _this7.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'createFolderTask',
        value: function createFolderTask(done) {
            var _this8 = this;

            if (!this.options.create || this.options.create.length == 0) {
                done();
                return;
            }

            this.logger.subhead('Create folders on remote');

            async.eachSeries(this.options.create, function (currentFolderToCreate, itemDone) {
                var path = _this8.release.path + '/' + currentFolderToCreate;
                _this8.logger.log(' - ' + currentFolderToCreate);

                _this8.remote.createFolder(path, itemDone);
            }, function () {
                _this8.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'makeDirectoriesWritableTask',
        value: function makeDirectoriesWritableTask(done) {
            var _this9 = this;

            if (!this.options.makeWritable || this.options.makeWritable.length == 0) {
                done();
                return;
            }

            this.logger.subhead('Make folders writable on remote');

            async.eachSeries(this.options.makeWritable, function (currentFolderToMakeWritable, itemDone) {
                var path = _this9.release.path + '/' + currentFolderToMakeWritable;
                var mode = 'ugo+w';

                _this9.logger.log(' - ' + currentFolderToMakeWritable);
                _this9.remote.chmod(path, mode, itemDone);
            }, function () {
                _this9.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'makeFilesExecutableTask',
        value: function makeFilesExecutableTask(done) {
            var _this10 = this;

            if (!this.options.makeExecutable || this.options.makeExecutable.length == 0) {
                done();
                return;
            }

            this.logger.subhead('Make files executables on remote');

            async.eachSeries(this.options.makeExecutable, function (currentFileToMakeExecutable, itemDone) {
                var path = _this10.release.path + '/' + currentFileToMakeExecutable;
                var command = 'chmod ugo+x ' + path;

                _this10.logger.log(' - ' + currentFileToMakeExecutable);
                _this10.remote.exec(command, itemDone);
            }, function () {
                _this10.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'updateCurrentSymbolicLinkOnRemoteTask',
        value: function updateCurrentSymbolicLinkOnRemoteTask(done) {
            this.logger.subhead('Update current release symlink on remote');

            var target = this.options.releasesFolder + '/' + this.release.tag;
            var currentPath = path.posix.join(this.options.deployPath, this.options.currentReleaseLink);

            this.remote.createSymboliclink(target, currentPath, function () {
                logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'onAfterDeployTask',
        value: function onAfterDeployTask(done) {
            this.options.onAfterDeploy(this.context, done);
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'onAfterDeployExecuteTask',
        value: function onAfterDeployExecuteTask(done) {
            this.middlewareCallbackExecute(this.options.onAfterDeployExecute, done);
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'remoteCleanupTask',
        value: function remoteCleanupTask(done) {
            var _this11 = this;

            this.logger.subhead('Remove old builds on remote');
            var spinner = this.logger.startSpinner('Removing');

            if (this.options.releasesToKeep < 1) {
                this.options.releasesToKeep = 1;
            }

            var folder = path.posix.join(this.options.deployPath, this.options.releasesFolder);

            this.remote.removeOldFolders(folder, this.options.releasesToKeep, function () {
                spinner.stop();
                _this11.logger.ok('Done');
                done();
            });
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'deleteLocalArchiveTask',
        value: function deleteLocalArchiveTask(done) {
            if (this.options.mode != 'archive' || !this.options.deleteLocalArchiveAfterDeployment) {
                done();
                return;
            }

            logger.subhead('Delete local archive');
            fs.unlink(this.options.archiveName);
            logger.ok('Done');
            done();
        }

        /**
         *
         * @param done
         */

    }, {
        key: 'closeConnectionTask',
        value: function closeConnectionTask(done) {
            this.remote.close(done);
        }

        /**
         * Remove release on remote
         * @param done
         */

    }, {
        key: 'removeReleaseTask',
        value: function removeReleaseTask(done) {
            var _this12 = this;

            this.logger.subhead('Remove releases on remote');

            var command = "rm -rf " + this.options.deployPath;
            this.remote.exec(command, function () {
                _this12.logger.ok('Done');
                done();
            });
        }

        // ================================================================


        /**
         * Execute commandsFunction results
         * @param commandsFunction function | []
         * @param callback
         */

    }, {
        key: 'middlewareCallbackExecute',
        value: function middlewareCallbackExecute(commandsFunction, callback) {
            var _this13 = this;

            if (!commandsFunction) {
                callback();
                return;
            }

            var commands = commandsFunction;

            // If commandsFunction is a function, take its result as commands
            if (typeof commandsFunction === 'function') {
                commands = commandsFunction(this.context);
            }

            // Nothing to execute
            if (!commands || commands.length == 0) {
                callback();
                return;
            }

            // Execute each command
            async.eachSeries(commands, function (command, innerCallback) {
                _this13.logger.subhead('Execute on remote : ' + command);
                _this13.remote.exec(command, innerCallback, true);
            }, function () {
                _this13.logger.ok('Done');
                callback();
            });
        }

        /**
         * Archiver factory
         * @param archiveType
         * @param archiveName
         * @param localPath
         * @param exclude
         * @returns {Archiver}
         */

    }, {
        key: 'createArchiver',
        value: function createArchiver(archiveType, archiveName, localPath, exclude) {
            return new Archiver(archiveType, archiveName, localPath, exclude);
        }
    }, {
        key: 'createRemote',


        /**
         * Remote factory
         */
        value: function createRemote(options, logger, onError) {
            return new Remote(options, logger, onError);
        }
    }]);

    return _class;
}();