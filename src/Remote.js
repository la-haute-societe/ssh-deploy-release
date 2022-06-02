const {Client}    = require('ssh2');
const fs          = require('fs');
const exec        = require('child_process').exec;
const async       = require('async');
const path        = require('path');
const shellEscape = require('any-shell-escape');
const utils       = require('./utils');
const cliProgress = require('cli-progress');
const chalk       = require('chalk');
const humanFormat = require('human-format');


/**
 * Remote
 * @type {{}}
 */
module.exports = class {
    constructor(options, logger, onError) {
        this.options = options;
        this.logger  = logger;
        this.onError = onError;

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

        // Instantiate connection
        this.connection = new Client();

        // Register events
        this.connection.on('ready', onReady);
        this.connection.on('error', onError);
        this.connection.on('close', onClose);

        if (this.options.onKeyboardInteractive) {
            this.connection.on('keyboard-interactive', this.options.onKeyboardInteractive);
        }

        const connectionOptions = Object.assign({}, this.options);

        // If debug is enabled, proxy output to console.log
        if (connectionOptions.debug) {
            connectionOptions.debug = console.log;
        }

        // Connect
        this.connection.connect(connectionOptions);
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
        this.connection.sftp((err, sftp) => {
            if (err) {
                return done(err);
            }

            this.logger.debug(`Uploading file ${src} => ${target}`);

            const progressBar = new cliProgress.SingleBar({
                format:     `|${chalk.cyan('{bar}')}| {bytesTransferred}/{bytesTotal} || {percentage}% || Elapsed: {duration_formatted}`,
                hideCursor: true
            }, cliProgress.Presets.shades_classic);

            progressBar.start(100, 0, {
                bytesTotal:       null,
                bytesTransferred: 0,
            });

            sftp.fastPut(
                src,
                target,
                {
                    chunkSize: 500,
                    step: (bytesTransferred, chunkSize, bytesTotal) => {
                        progressBar.update(bytesTransferred / bytesTotal * 100, {
                            bytesTransferred: humanFormat(bytesTransferred, { scale: 'binary', unit: 'B' }),
                            bytesTotal:       humanFormat(bytesTotal, { scale: 'binary', unit: 'B' }),
                        });
                    }
                },
                (err) => {
                    progressBar.stop();
                    done(err);
                }
            );
        });
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
        const escapedUsername = shellEscape(this.options.username);

        // Construct rsync command
        let remoteShell = '';

        // Use password
        if (this.options.password != '') {
            const escapedPassword = shellEscape(this.options.password);
            remoteShell = `--rsh='sshpass -p "${escapedPassword}" ssh -l ${escapedUsername} -p ${this.options.port} -o StrictHostKeyChecking=no'`;
        }

        // Use privateKey
        else if (this.options.privateKeyFile != null) {
            const escapedPrivateKeyFile = shellEscape(this.options.privateKeyFile);

            let passphrase = '';
            if (this.options.passphrase) {
                passphrase = `sshpass -p'${(shellEscape(this.options.passphrase))}' -P"assphrase for key"`;
            }

            remoteShell = `--rsh='${passphrase} ssh -l ${escapedUsername} -i ${escapedPrivateKeyFile} -p ${this.options.port} -o StrictHostKeyChecking=no'`;
        }

        // Excludes
        const excludes = this.options.exclude.map(path => `--exclude=${shellEscape(path)}`);

        // Compression
        let compression = this.options.compression !== false ? '--compress': '';
        if (typeof this.options.compression === 'number') {
            compression += ` --compress-level=${this.options.compression}`;
        }

        // Concat
        const synchronizeCommand = [
            'rsync',
            remoteShell,
            ...this.options.rsyncOptions,
            compression,
            ...excludes,
            '--delete-excluded',
            '-a',
            '--stats',
            '--delete',
            source,
            fullTarget
        ].join(' ');

        // Exec !
        this.logger.debug(`Local command : ${synchronizeCommand}`);
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
