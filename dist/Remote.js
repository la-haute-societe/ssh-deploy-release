'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Connection = require('ssh2');
var fs = require('fs');
var exec = require('child_process').exec;
var async = require('async');

var utils = require('./utils');

/**
 * Remote
 * @type {{}}
 */
module.exports = function () {
    function _class(options, logger, onError) {
        _classCallCheck(this, _class);

        this.options = options;
        this.logger = logger;
        this.onError = onError;

        this.client = require('scp2');

        if (options.privateKeyFile) {
            options.privateKey = fs.readFileSync(options.privateKeyFile);
        }
    }

    /**
     * Initiate SSH and SCP connection
     * @param onReady
     * @param onError
     * @param onClose
     */


    _createClass(_class, [{
        key: 'connect',
        value: function connect(onReady, onError, onClose) {

            // Instanciate connection
            this.connection = new Connection();

            // Register events
            this.connection.on('ready', onReady);
            this.connection.on('error', onError);
            this.connection.on('close', onClose);

            // Connect
            this.connection.connect(this.options);

            var scpOptions = {
                port: this.options.port,
                host: this.options.host,
                username: this.options.username,
                readyTimeout: this.options.readyTimeout
            };

            // Private key authentication
            if (this.options.privateKey) {
                scpOptions.privateKey = this.options.privateKey;
                if (this.options.passphrase) {
                    scpOptions.passphrase = this.options.passphrase;
                }
            }

            // Password authentication
            else if (this.options.password) {
                    scpOptions.password = this.options.password;
                }

                // Agent authentication
                else if (this.options.agent) {
                        scpOptions.agent = this.options.agent;
                    }

                    // No authentication
                    else {
                            throw new Error('Agent, password or private key required for secure copy.');
                        }

            this.client.defaults(scpOptions);
        }

        /**
         * Exec command on remote using SSH connection
         * @param command
         * @param done
         * @param log Log result
         */

    }, {
        key: 'exec',
        value: function exec(command, done, log) {
            var _this = this;

            this.connection.exec(command, function (error, stream) {

                if (error) {
                    _this.onError(command, error);
                    return;
                }

                stream.on('data', function (data, extended) {
                    if (log) {
                        _this.logger.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
                        return;
                    }

                    _this.logger.debug((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
                });

                stream.on('end', function () {
                    _this.logger.debug('Remote command : ' + command);
                    done();
                });
            });
        }

        /**
         * Exec multiple commands on remote using SSH connection
         * @param commands
         * @param done
         * @param log Log result
         */

    }, {
        key: 'execMultiple',
        value: function execMultiple(commands, done, log) {
            var _this2 = this;

            async.eachSeries(commands, function (command, itemCallback) {
                _this2.exec(command, function () {
                    itemCallback();
                }, log);
            }, done);
        }

        /**
         * Upload file on remote
         * @param src
         * @param target
         * @param done
         */

    }, {
        key: 'upload',
        value: function upload(src, target, done) {
            this.client.scp(src, {
                path: target
            }, done);
        }

        /**
         * Synchronize local folder src to remote folder target
         * @param src
         * @param synchronizedFolder
         * @param done
         */

    }, {
        key: 'synchronize',
        value: function synchronize(src, target, synchronizedFolder, done) {
            var _this3 = this;

            var source = src + '/';
            var fullTarget = this.options.username + '@' + this.options.host + ':' + synchronizedFolder;

            // Construct rsync command
            var sshpass = '';

            // Use password
            if (this.options.password != '') {
                sshpass = '--rsh=\'sshpass -p "' + this.options.password + '" ssh -l ' + this.options.username + ' -o StrictHostKeyChecking=no\'';
            }

            // Use privateKey
            else if (this.options.privateKeyFile != null) {
                    logger.fatal('PrivateKey not compatible with synchronize mode.');
                }

            // Concat
            var synchronizeCommand = 'rsync ' + sshpass + ' ' + this.options.rsyncOptions + ' -a --stats --delete ' + source + ' ' + fullTarget;

            // Exec !
            exec(synchronizeCommand, function (error, stdout, stderr) {

                if (error) {
                    _this3.logger.fatal(error);
                    return;
                }

                if (stdout) {
                    _this3.logger.log(stdout);
                }

                if (stderr) {
                    _this3.logger.log(stderr);
                }

                _this3.synchronizeRemote(_this3.options.deployPath + '/' + _this3.options.synchronizedFolder, target, done);
            });
        }

        /**
         * Synchronize two remote folders
         * @param src
         * @param target
         * @param done
         */

    }, {
        key: 'synchronizeRemote',
        value: function synchronizeRemote(src, target, done) {
            var copy = 'rsync -a ' + src + '/ ' + target;

            this.exec(copy, function () {
                done();
            });
        }

        /**
         * Create symbolic link on remote
         * @param target
         * @param link
         * @param done
         */

    }, {
        key: 'createSymboliclink',
        value: function createSymboliclink(target, link, done) {
            var commands = ['mkdir -p ' + link, // Create the parent of the symlink target
            'rm -rf ' + link, 'mkdir -p ' + utils.realpath(link + '/../' + target), // Create the symlink target
            'ln -nfs ' + target + ' ' + link];

            this.execMultiple(commands, done);
        }

        /**
         * Chmod path on remote
         * @param path
         * @param mode
         * @param done
         */

    }, {
        key: 'chmod',
        value: function chmod(path, mode, done) {
            var command = 'chmod ' + mode + ' ' + path;

            this.exec(command, function () {
                done();
            });
        }

        /**
         * Create folder on remote
         * @param path
         * @param done
         */

    }, {
        key: 'createFolder',
        value: function createFolder(path, done) {
            var commands = ['mkdir -p ' + path, 'chmod ugo+w ' + path];
            this.execMultiple(commands, done);
        }

        /**
         * Remove old folders on remote
         * @param folder
         * @param numberToKeep
         * @param done
         */

    }, {
        key: 'removeOldFolders',
        value: function removeOldFolders(folder, numberToKeep, done) {
            var commands = ["cd " + folder, "rm -rf `ls -r " + folder + " | awk 'NR>" + numberToKeep + "'`"];

            this.execMultiple(commands, function () {
                done();
            });
        }
    }, {
        key: 'close',
        value: function close(done) {
            this.connection.end();
            this.client.close();
            this.client.__sftp = null;
            this.client.__ssh = null;
            done();
        }
    }]);

    return _class;
}();