const { spawn } = require( 'node:child_process' );
const glob = require( 'glob' );
require( 'dotenv' ).config();

const Tweeter = require( './Tweeter.js' );
const PARAMS = require('./params.js');

const deleteDirContents = ( dir ) => {
    let rm;

    return new Promise( ( resolve, reject ) => {
        glob( dir, ( err, files ) => {
            if ( err ) { reject( err ); } 

            for ( let file = 0; file < files.length; file++ ) {

                // Deleting file
                rm = spawn( 'rm', [ files[ file ] ] );
                
                // Printing process info
                rm.stdout.on( 'data', ( data ) => {
                    console.log( `stdout: ${ data }` );
                });
                rm.stderr.on( 'data', ( data ) => {
                    console.error( `stderr: ${ data }` );
                });
                rm.on('close', ( code ) => {
                    console.log( `rm exited with code ${ code }` );
                });     
            }
            resolve( `The contents of ${ dir } was deleted.` );
        } );
    } );
};

const getDirContents = ( dir ) => {
    return new Promise( ( resolve, reject ) => {
        glob( dir, ( err, files ) => {
            if ( err ) { reject( err ); } 
            resolve( files );
        } );
    } );
};


const uploadVideo = async () => {
    const O_AUTH_INFO = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_KEY_SECRET,
        token: process.env.ACCESS_TOKEN,
        token_secret: process.env.ACCESS_TOKEN_SECRET
    };
    const TWEETER = new Tweeter(O_AUTH_INFO);
    const MEDIA_DIR = './media/*';
    let videoFiles;
    let statusText;
    let mediaFile = {
        path: '',
        mimetype: 'video/mp4',
        media_category: 'tweet_video',
        media_id: '',
        state: ''
    };

    return new Promise(async (resolve, reject) => {
        try {
            videoFiles = await getDirContents( MEDIA_DIR );
            if (videoFiles.length > 0)
            {
                mediaFile.path = videoFiles[0];
                mediaFile = await TWEETER.prepVideo( mediaFile );
                switch ( mediaFile.state ) {
                    case 'succeeded':
                        statusText = 'Testing interval motion cam | '
                                    // 'Budgie Box Cam '
                                    // + '| Rachael and Roger | '
                                    + new Date().toLocaleString( 'AU' );
                        console.log(
                            await TWEETER.tweetTextAndVideo(
                                            statusText, 
                                            mediaFile.media_id
                                            )
                        );
                        break;
                    case 'failed':
                        console.log( "The video failed to upload" );
                        break;
                }
                console.log(
                    await deleteDirContents( MEDIA_DIR )
                );
            }
            else {
                statusText = 'Budgie Box Cam '
                            + '| Rachael and Roger '
                            + '| NO MOTION DETECTED | ' 
                            + new Date().toLocaleString('AU');
    
                try {
                    console.log( await TWEETER.tweetText( statusText ) );
                }
                catch ( err ) {
                    console.error( err );
                }
            }
        }
        catch ( err ) {
            console.error( err );
        }
    } );
};


/**
 * Runs the Twitter bot.
 */                              
let run = async () => {

    // The motion configuration file.
    const MOTION_CONFIG_FILE = './motion.conf'; 
    // The motion child-process
    const MOTION = spawn( 'motion', ['-c', MOTION_CONFIG_FILE] );

    // Motion-process command for on stdout.
    MOTION.stdout.on( 'data', ( data ) => {
        console.log(`stdout: ${data}`);
    } );

    // Motion-process command for on stderr.
    MOTION.stderr.on( 'data', ( data ) => {
        console.error(`stderr: ${data}`);
    } );

    // Motion-process command for on close.
    // After on close we upload the recorded video.
    MOTION.on( 'close', ( code ) => {
        console.log(`motion exited with code ${code}`);
        uploadVideo();
    } );
    
    setTimeout(() => {
        // Killing the motion process. When the motion-process ends,
        // its callback attempts to upload the recorded video if 
        // one has been recorded.
        console.log('Ending the motion process...');
        MOTION.kill();
    }, PARAMS.video_length );
}

run();
setInterval( () => {
  run();
}, PARAMS.upload_freq );

