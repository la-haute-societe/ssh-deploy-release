const Connection = require('ssh2');
const fs         = require('fs');
const exec       = require('child_process').exec;
const async      = require('async');
const extend     = require('extend');
const path       = require('path');

const utils = require('./utils');


/**
 * Remote
 * @type {{}}
 */
module.exports = class {
    constructor(options, logger, onError) {
        this.options = options;
        this.logger  = logger;
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
    connect(onReady, onError, onClose) {

        // Instanciate connection
        this.connection = new Connection();

        // Register events
        this.connection.on('ready', onReady);
        this.connection.on('error', onError);
        this.connection.on('close', onClose);

        // Connect
        this.connection.connect(this.options);

        this.scpOptions = {
            port: this.options.port,
            host: this.options.host,
            username: this.options.username,
            readyTimeout: this.options.readyTimeout
        };

        // Private key authentication
        if (this.options.privateKey) {
            this.scpOptions.privateKey = this.options.privateKey;
            if (this.options.passphrase) {
                this.scpOptions.passphrase = this.options.passphrase;
            }
        }

        // Password authentication
        else if (this.options.password) {
            this.scpOptions.password = this.options.password;
        }

        // Agent authentication
        else if (this.options.agent) {
            this.scpOptions.agent = this.options.agent;
        }

        // No authentication
        else {
            throw new Error('Agent, password or private key required for secure copy.');
        }

        this.client.defaults(this.scpOptions);
    }


    /**
     * Exec command on remote using SSH connection
     * @param command
     * @param {Function} done A NodeJS error first-callback. The second argument is a string representing the command output.
     * @param log Log result
     */
    exec(command, done, log) {
        this.connection.exec(command, (error, stream) => {
            const stdout = [];
            const stderr = [];

            if (error) {
                this.onError(command, error);
            }

            stream.stderr.on('data', data => {
                stderr.push(data.toString());
                this.logger.error(`STDERR: ${data}`);
            });

            stream.on('data', data => {
                stdout.push(data.toString());
                if (log) {
                    this.logger.log(`STDOUT: ${data}`);
                    return;
                }

                this.logger.debug(`STDOUT: ${data}`);
            });
            
            stream.on('close', (exitCode, exitSignal) => {

                // Error
                if (exitCode !== 0) {
                    this.logger.fatal('This command returns an error : "' + command + '"');
                }

                this.logger.debug(`Remote command : ${command}`);
                done(null, exitCode, exitSignal, stdout, stderr);
            });
        });
    }


    /**
     * Exec multiple commands on remote using SSH connection
     * @param commands
     * @param done
     * @param log Log result
     */
    execMultiple(commands, done, log) {

        async.eachSeries(commands, (command, itemCallback) => {

            this.exec(command, (error, exitCode, exitSignal, stdout, stderr) => {
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
    upload(src, target, done) {
        this.client.scp(
            src,
            extend(
                this.scpOptions,
                {path: target}
            ),
            done
        );
    }

    /**
     * Synchronize local folder src to remote folder target
     * @param src
     * @param synchronizedFolder
     * @param done
     */
    synchronize(src, target, synchronizedFolder, done) {

        const source     = src + '/';
        const fullTarget = this.options.username + '@' + this.options.host + ':' + synchronizedFolder;

        // Construct rsync command
        let sshpass = '';

        // Use password
        if (this.options.password != '') {
            sshpass = '--rsh=\'sshpass -p "' + this.options.password + '" ssh -l ' + this.options.username + ' -p ' + this.options.port + ' -o StrictHostKeyChecking=no\'';
        }

        // Use privateKey
        else if (this.options.privateKeyFile != null) {
            this.logger.fatal('PrivateKey not compatible with synchronize mode.');
        }

        // Concat
        let synchronizeCommand = 'rsync ' + sshpass + ' ' + this.options.rsyncOptions + ' -a --stats --delete ' + source + ' ' + fullTarget;

        // Exec !
        exec(synchronizeCommand, (error, stdout, stderr) => {

            if (error) {
                this.logger.fatal(error);
                return;
            }

            if (stdout) {
                this.logger.log(stdout);
            }

            if (stderr) {
                this.logger.log(stderr);
            }

            this.synchronizeRemote(
                this.options.deployPath + '/' + this.options.synchronizedFolder,
                target,
                done
            );
        });
    }


    /**
     * Synchronize two remote folders
     * @param src
     * @param target
     * @param done
     */
    synchronizeRemote(src, target, done) {
        const copy = 'rsync -a ' + src + '/ ' + target;

        this.exec(copy, () => {
            done();
        });
    }


    /**
     * Create symbolic link on remote
     * @param target
     * @param link
     * @param done
     */
    createSymboliclink(target, link, done) {
        link                = utils.realpath(link);
        const symlinkTarget = utils.realpath(link + '/../' + target);

        const commands = [
            `mkdir -p \`dirname ${link}\``, // Create the parent of the symlink
            `if test ! -e ${symlinkTarget}; then mkdir -p ${symlinkTarget}; fi`, // Create the symlink target, if it doesn't exist
            `ln -nfs ${target} ${link}`
        ];

        this.execMultiple(commands, done);
    }

    /**
     * Chmod path on remote
     * @param path
     * @param mode
     * @param done
     */
    chmod(path, mode, done) {
        const command = 'chmod ' + mode + ' ' + path;

        this.exec(command, function () {
            done();
        });
    }

    /**
     * Create folder on remote
     * @param path
     * @param done
     */
    createFolder(path, done) {
        const commands = [
            'mkdir -p ' + path,
            'chmod ugo+w ' + path
        ];
        this.execMultiple(commands, done);
    }


    /**
     * Remove old folders on remote
     * @param folder
     * @param numberToKeep
     * @param done
     */
    removeOldFolders(folder, numberToKeep, done) {
        const commands = [
            "cd " + folder + " && rm -rf `ls -r " + folder + " | awk 'NR>" + numberToKeep + "'`"
        ];


        this.execMultiple(commands, () => {
            done();
        });
    }

    close(done) {
        this.connection.end();
        this.client.close();
        this.client.__sftp = null;
        this.client.__ssh  = null;
        done();
    }

    getPenultimateRelease(done) {
        return new Promise((resolve, reject) => {
            const releasesPath                       = path.posix.join(this.options.deployPath, this.options.releasesFolder);
            const getPreviousReleaseDirectoryCommand = `ls -r  -d ${releasesPath}/*/ | grep -v rollbacked | awk 'NR==2'`;

            this.exec(getPreviousReleaseDirectoryCommand, (err, exitCode, exitSignal, stdout, stderr) => {
                if (err) {
                    reject(err);
                    return;
                }

                const penultimateRelease = stdout[0];
                if (!penultimateRelease) {
                    reject('No previous release to rollback to');
                    return;
                }

                resolve(penultimateRelease);
            });
        });
    }
};
