# ssh-deploy-release

Deploy releases over SSH with rsync, archive ZIP / TAR, symlinks, SCP ...


Example :

```
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
```


- [Installation](#installation)
- [Usage](#usage)
- [Options](#options)
- [Known issues](#known-issues)
- [Contributing](#contributing)


## Installation

`npm install ssh-deploy-release`



## Usage

### Deploy release

```js
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
```


### Remove release

```js
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
```

## Options

ssh-deploy-release uses ssh2 to handle SSH connections.  
The `options` object is forwarded to `ssh2` methods,
which means you can set all `ssh2` options:

 - [ssh2 documentation](https://github.com/mscdex/ssh2)

#### options.debug
If ``true``, will display all commands.

Default : ``false``

#### options.port
Port used to connect to the remote server.

Default : 22

#### options.host
Remote server hostname.

#### options.username
Username used to connect to the remote server.

#### options.password
Password used to connect to the remote server.

#### options.privateKeyFile
For an encrypted private key, this is the passphrase used to decrypt it.

Default: (null)


#### options.passphrase

Default: null

#### options.mode
'archive' : Deploy an archive and decompress it on the remote server.

'synchronize' : Use *rsync*. Files are synchronized in the `options.synchronized` folder on the remote server.

Default : 'archive'

#### options.archiveType
'zip' : Use *zip* compression (``unzip`` command on remote)

'tar' : Use *tar gz* compression (``tar`` command on remote)

Default : 'tar'

#### options.archiveName
Name of the archive.

Default : 'release.tar.gz'


#### options.deleteLocalArchiveAfterDeployment
Delete the local archive after the deployment. 

Default : true

#### options.readyTimeout
SCP connection timeout duration.

Default : 20000

### Path
#### options.currentReleaseLink
Name of the current release symbolic link. Relative to `deployPath`.

Defaut : 'www'

#### options.sharedFolder
Name of the folder containing shared folders. Relative to `deployPath`.

Default : 'shared'

#### options.releasesFolder
Name of the folder containing releases. Relative to `deployPath`.

Default : 'releases'

#### options.localPath
Name of the local folder to deploy.

Default : 'www'

#### options.deployPath
Absolute path on the remote server where releases will be deployed.
Do not specify *currentReleaseLink* (or *www* folder) in this path.

#### options.synchronizedFolder
Name of the remote folder where *rsync* synchronize release.
Used when `mode` is 'synchronize'.

Default : 'www'

#### options.rsyncOptions
Additional options for rsync process. 

Default : ''

```js
rsyncOptions : '--exclude-from="exclude.txt" --delete-excluded'
```



### Releases

#### options.releasesToKeep
Number of releases to keep on the remote server.

Default : 3

#### options.tag
Name of the release. Must be different for each release.

Default : Use current timestamp.

#### options.exclude
List of paths (*glob* format) to **not** deploy. Paths must be relative to `localPath`.

Not compatible with `mode: 'synchronize'`, use `rsyncOptions` instead to exclude some files.

Default : []

#### options.share
List of folders to "share" between releases. A symlink will be created for each item.  
Item can be either a string or an object (to specify the mode to set to the symlink target).

```js
share: {
    'images': 'assets/images',
    'upload': {
        symlink: 'app/upload',
        mode:    '777' // Will chmod 777 shared/upload
    }
}
```
Keys = Folder to share (relative to `sharedFolder`)

Values = Symlink path  (relative to release folder)

#### options.create
List of folders to create on the remote server.


#### options.makeWritable
List of files to make writable on the remote server. (chmod ugo+w)


#### options.makeExecutable
List of files to make executable on the remote server. (chmod ugo+x)


#### options.allowRemove
If true, the remote release folder can be deleted with `--remove` cli parameter.

Default: false



### Callback

##### context object
The following object is passed to ``onXXXDeploy`` functions :
```js
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
```

##### Example with onXXXDeploy
*onBeforeDeploy, onBeforeLink, onAfterDeploy options.*

You have to call ``done`` function to continue deployment process.

```js
onAfterDeploy: (context, done) => {
    context.logger.subhead('Do something');
    const spinner = context.logger.startSpinner('Doing something');
    const command = 'ls -la';
    const showLog = true;
    
    deployer.remote.exec(
        command,
        () => {
            spinner.stop();
            done();
        },
        showLog
    );
}
```

##### Example with onXXXDeployExecute
*onBeforeDeployExecute, onBeforeLinkExecute, onAfterDeployExecute options.*

```js
onAfterDeployExecute: [
    'do something on the remote server',
    'and another thing'
]
```

**Or** with a function :

```js
onAfterDeployExecute: (context) => {
    context.logger.subhead('Doing something');
    return [
        'do something on the remote server',
        'and another thing'
    ];
}
```

#### options.onBeforeDeploy
Function called before deployment. Call `done` to continue;

Type: function(context, done)


#### options.onBeforeDeployExecute
Array (or function returning array) of commands to execute on the remote server.

Type: function(context) | []


#### options.onBeforeLink
Function called before symlink creation. Call `done` to continue;

Type: function(context, done)


#### options.onBeforeLinkExecute
Array (or function returning array) of commands to execute on the remote server.

Type: function(context) | []


#### options.onAfterDeploy
Function called after deployment. Call `done` to continue;

Type: function(context, done)


#### options.onAfterDeployExecute
Array (or function returning array) of commands to execute on the remote server.

Type: function(context) | []


## Known issues
 
### Command not found or not executed

A command on a callback method is not executed or not found. 
Try to add `set -i && source ~/.bashrc &&` before your commmand : 

```
onAfterDeployExecute:[
    'set -i && source ~/.bashrc && my command'
]
```

See this issue : https://github.com/mscdex/ssh2/issues/77



## Contributing

```
# Build
npm run build

# Build + watch
npm run build -- --watch

# Launch tests
npm test

# Launch tests + watch
npm test -- --watch
```