const { spawn } = require( 'node:child_process' );
const glob = require( 'glob' );
require( 'dotenv' ).config();

const Tweeter = require( './Tweeter.js' );

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


/**
 * Runs the Twitter bot.
 */                              
let run = function() {

    const MOTION_CONFIG_FILE = './motion.conf';

    // Spawning motion process to record a motion-detected video
    const motion = spawn('motion', ['-c', MOTION_CONFIG_FILE] );

    // Printing motion-process information
    motion.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });
    motion.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });
    motion.on('close', (code) => {
        console.log(`motion exited with code ${code}`);
    });

    setTimeout(() => {

        // Killing motion process
        console.log('Killing motion');
        motion.kill();
        console.log("Waiting for the motion process to exit...");

        setTimeout( async () => {

            const O_AUTH_INFO = {
                consumer_key: process.env.CONSUMER_KEY,
                consumer_secret: process.env.CONSUMER_KEY_SECRET,
                token: process.env.ACCESS_TOKEN,
                token_secret: process.env.ACCESS_TOKEN_SECRET
            };
            const TWEETER = new Tweeter(O_AUTH_INFO);
            const MEDIA_DIR = './media';
            let videofiles;
            let statusText;
            let mediaFile = {
                path: '',
                mimetype: 'video/mp4',
                media_category: 'tweet_video',
                media_id: '',
                state: ''
            };
            

            try {
                videofiles = await getDirContents( MEDIA_DIR );
                if (videofiles.length > 0)
                {
                    mediaFile.path = videoFiles[0];
                    mediaFile = await TWEETER.prepVideo( mediaFile );
                    switch ( mediaFile.state ) {
                        case 'succeeded':
                            statusText = 'Budgie Box Cam '
                                        + '| Rachael and Roger | '
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

        }, 1000 * 30 );
    }, ( 1000 * 60 * 60 * 2 ) + ( 1000 * 50 * 45 ) );
}

run();
setInterval( () => {
  run();
}, 1000 * 60 * 60 * 3 );

