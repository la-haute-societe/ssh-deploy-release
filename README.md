# ssh-deploy-release

[![NPM version](https://badge.fury.io/js/ssh-deploy-release.svg)](https://badge.fury.io/js/deployator)
![npm (tag)](https://img.shields.io/npm/v/ssh-deploy-release/beta)
![](https://img.shields.io/npm/dm/ssh-deploy-release.svg)

> Deploy releases over SSH with rsync, archive ZIP / TAR, symlinks, SCP ...


Example :

````
/deployPath
    |
    ├── www --> symlink to ./releases/<currentRelease>
    |
    ├── releases
    |   ├── 2017-02-08-17-14-21-867-UTC
    |   ├── ...
    |   └── 2017-02-09-18-01-10-765-UTC
    |       ├── ...
    |       └── logs --> symlink to shared/logs
    |
    ├── synchronized --> folder synchronized with rsync 
    |
    └── shared
        └── logs                    
````


- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Known issues](#known-issues)
- [Contributing](#contributing)


## Installation

`npm install ssh-deploy-release`



## Usage

### Deploy release

````js
const Deployer = require('ssh-deploy-release');

const options = {
    localPath: 'src',
    host: 'my.server.com',
    username: 'username',
    password: 'password',
    deployPath: '/var/www/vhost/path/to/project'
};

const deployer = new Deployer(options);
deployer.deployRelease(() => {
    console.log('Ok !')
});
````


### Remove release

````js
const Deployer = require('ssh-deploy-release');

const options = {
    localPath: 'src',
    host: 'my.server.com',
    username: 'username',
    password: 'password',
    deployPath: '/var/www/vhost/path/to/project',
    allowRemove: true
};

const deployer = new Deployer(options);
deployer.removeRelease(() => {
    console.log('Ok !')
});
````


### Rollback to previous release
````js
const Deployer = require('ssh-deploy-release');

const options = {
    localPath: 'src',
    host: 'my.server.com',
    username: 'username',
    password: 'password',
    deployPath: '/var/www/vhost/path/to/project'
};

const deployer = new Deployer(options);
deployer.rollbackToPreviousRelease(() => {
    console.log('Ok !')
});
````

The previous release will be renamed before updating the symlink of the current version, for example 
`2019-01-09-10-53-35-265-UTC` will become
`2019-01-09-13-46-45-457-UTC_rollback-to_2019-01-09-10-53-35-265-UTC`.

If `rollbackToPreviousRelease` is called several times, the current version 
will switch between the last two releases. 
`current date + "_rollbackTo_"`  will be prepended to the release name on each call of 
`rollbackToPreviousRelease` so be careful not to exceed the size limit of the folder name.


### Use with Grunt

Use [grunt-ssh-deploy-release](https://github.com/la-haute-societe/grunt-ssh-deploy-release).



## Options

ssh-deploy-release uses ssh2 to handle SSH connections.  
The `options` object is forwarded to `ssh2` methods,
which means you can set all `ssh2` options:

 - [ssh2 documentation](https://github.com/mscdex/ssh2)

#### options.debug
If `true`, will display all commands.

Default : `false`


#### options.port
Port used to connect to the remote server.

Default : `22`


#### options.host
Remote server hostname.


#### options.username
Username used to connect to the remote server.


#### options.password
Password used to connect to the remote server.

Default: `null`


#### options.privateKeyFile

Default: `null`


#### options.passphrase
For an encrypted private key, this is the passphrase used to decrypt it.

Default: `null`


#### options.agent
To connect using the machine's ssh-agent. The value must be the path to the ssh-agent socket (usually available in the
`SSH_AUTH_SOCK` environment variable).


#### options.mode
`archive` : Deploy an archive and decompress it on the remote server.

`synchronize` : Use *rsync*. Files are synchronized in the `options.synchronized` folder on the remote server.

Default : `archive`


#### options.archiveType
`zip` : Use *zip* compression (`unzip` command on remote)

`tar` : Use *tar gz* compression (`tar` command on remote)

Default : `tar`


#### options.archiveName
Name of the archive.

Default : `release.tar.gz`


#### options.deleteLocalArchiveAfterDeployment
Delete the local archive after the deployment. 

Default : `true`


#### options.readyTimeout
SCP connection timeout duration.

Default : `20000`


### Path
#### options.currentReleaseLink
Name of the current release symbolic link. Relative to `deployPath`.

Defaut : `www`


#### options.sharedFolder
Name of the folder containing shared folders. Relative to `deployPath`.

Default : `shared`


#### options.releasesFolder
Name of the folder containing releases. Relative to `deployPath`.

Default : `releases`


#### options.localPath
Name of the local folder to deploy.

Default : `www`


#### options.deployPath
Absolute path on the remote server where releases will be deployed.
Do not specify *currentReleaseLink* (or *www* folder) in this path.


#### options.synchronizedFolder
Name of the remote folder where *rsync* synchronize release.
Used when `mode` is 'synchronize'.

Default : `www`


#### options.rsyncOptions
Additional options for rsync process. 

Default : `''`

````js
rsyncOptions : '--exclude-from="exclude.txt" --delete-excluded'
````


#### options.compression
Enable the rsync --compression flag. This can be set to a boolean or
an integer to explicitly set the compression level (--compress-level=NUM).

Default : `true`


### Releases

#### options.releasesToKeep
Number of releases to keep on the remote server.

Default : `3`

#### options.tag
Name of the release. Must be different for each release.

Default : Use current timestamp.

#### options.exclude
List of paths to **not** deploy.

Paths must be relative to `localPath`.

The format slightly differ depending on the `mode`:

  * *glob* format for `mode: 'archive'`  
    In order to exclude a folder, you have to explicitly ignore all its descending files using `**`.  
    For example: `exclude: ['my-folder/**']`  
    > Read [*glob* documentation](https://github.com/isaacs/node-glob) for more information.
  * *rsync exclude pattern* format for `mode: 'synchronize'`  
    In order to exclude a folder, you simply have to list it, all of its descendants will be excluded as well.  
    For example: `exclude: ['my-folder']`

For maximum portability, it's strongly advised to use both syntaxes when excluding folders.  
For example: `exclude: ['my-folder/**', 'my-folder']` 

Default : `[]`

#### options.share
List of folders to "share" between releases. A symlink will be created for each item.  
Item can be either a string or an object (to specify the mode to set to the symlink target).

````js
share: {
    'images': 'assets/images',
    'upload': {
        symlink: 'app/upload',
        mode:    '777' // Will chmod 777 shared/upload
    }
}
````

Keys = Folder to share (relative to `sharedFolder`)

Values = Symlink path  (relative to release folder)

Default : `{}`

#### options.create
List of folders to create on the remote server.

Default : `[]`


#### options.makeWritable
List of files to make writable on the remote server. (chmod ugo+w)

Default : `[]`

#### options.makeExecutable
List of files to make executable on the remote server. (chmod ugo+x)

Default : `[]`

#### options.allowRemove
If true, the remote release folder can be deleted with `removeRelease` method.

Default: `false`



### Callbacks

##### context object
The following object is passed to `onXXX` callbacks :
````js
{
    // Loaded configuration
    options: { },
    
    // Release
    release: {
         // Current release name
         tag: '2017-01-25-08-40-15-138-UTC',
         
         // Current release path on the remote server
         path: '/opt/.../releases/2017-01-25-08-40-15-138-UTC',           
    },
    
    // Logger methods
    logger: {
        // Log fatal error and stop process
        fatal: (message) => {},
        
        // Log 'subhead' message
        subhead: (message) => {},
        
        // Log 'ok' message
        ok: (message) => {},
        
        // Log 'error' message and continue process
        error: (message) => {},
        
        // Log message, only if options.debug is true
        debug: (message) => {},
        
        // Log message
        log: (message) => {},
        
        // Start a spinner and display message
        // return a stop() 
        startSpinner: (message) => { return {stop: () => {}}},
    },
    
    // Remote server methods
    remote: {
        // Excute command on the remote server
        exec: (command, done, showLog) => {},
        
        // Excute multiple commands (array) on the remote server
        execMultiple: (commands, done, showLog) => {},
        
        // Upload local src file to target on the remote server
        upload: (src, target, done) => {},
        
        // Create a symbolic link on the remote server
        createSymboliclink: (target, link, done) => {},
        
        // Chmod path on the remote server
        chmod: (path, mode, done) => {},
        
        // Create folder on the remote server
        createFolder: (path, done) => {},
    }
}
````

##### Examples
*onBeforeDeploy, onBeforeLink, onAfterDeploy, onBeforeRollback, onAfterRollback options.*

###### Single command executed on remote

````js
onAfterDeploy: 'apachectl graceful'
````

**Or** with a function :

````js
onBeforeLink: context => `chgrp -R www ${context.release.path}`
````


###### List of commands executed on remote

````js
onAfterDeploy: [
    'do something on the remote server',
    'and another thing'
]
````

**Or** with a function :

````js
onBeforeLink: (context) => {
    context.logger.subhead('Fine tuning permissions on newly deployed release');
    return [
        `chgrp -R www ${context.release.path}`,
        `chmod g+w ${context.release.path}/some/path/that/needs/to/be/writable/by/www/group`,
    ];
}
````


###### Custom callback

````js
onAfterDeploy: context => {
  return Promise((resolve, reject) => {
    setTimeout(function () {
      // Do something
      resolve();
    }, 5000);
  });
}
````




#### options.onBeforeDeploy
Executed before deployment.

Type: `string | string[] | function(context, done): Promise | undefined`


#### options.onBeforeLink
Executed before symlink creation.

Type: `string | string[] | function(context, done): Promise | undefined`


#### options.onAfterDeploy
Executed after deployment.

Type: `string | string[] | function(context, done): Promise | undefined`


#### options.onBeforeRollback
Executed before rollback to previous release. 

Type: `string | string[] | function(context, done): Promise | undefined`


#### options.onAfterRollback
Executed after rollback to previous release. 

Type: `string | string[] | function(context, done): Promise | undefined`




## Known issues
 
### Command not found or not executed

A command on a callback method is not executed or not found. 
Try to add `set -i && source ~/.bashrc &&` before your commmand : 

````
onAfterDeploy:[
    'set -i && source ~/.bashrc && my command'
]
````

See this issue : https://github.com/mscdex/ssh2/issues/77



## Contributing

````bash
# Build (with Babel)
npm run build

# Build + watch (with Babel)
npm run build -- --watch

# Launch tests (Mocha + SinonJS)
npm test

# Launch tests + watch (Mocha + SinonJS)
npm test -- --watch
````
