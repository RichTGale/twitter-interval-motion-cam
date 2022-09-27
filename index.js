const { spawn } = require( 'node:child_process' );
const glob = require( 'glob' );
require( 'dotenv' ).config();

const PARAMS = require('./params.js');
let Tweeter = require( './Tweeter.js' );

/**
 * Deletes the contents of the provided directory.
 */
const deleteDirContents = ( dir ) => {
    let rm; // The rm child-process.

    return new Promise( ( resolve, reject ) => {
        // Getting the contents of the directory.
        glob( dir, ( err, files ) => {

            // Determining if there's an error and returning it.
            if ( err ) { reject( err ); } 

            // Deleting every file in the directory.
            for ( let file = 0; file < files.length; file++ ) {

                // Spawning the child-process and deleting a file.
                rm = spawn( 'rm', [ files[ file ] ] );
                
                // Printing the child-process info.
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

            // Returning a success message.
            resolve( `The contents of ${ dir } was deleted.` );
        } );
    } );
};

/**
 * Returns an array of strings representing each file in the provided directory.
 */
const getDirContents = ( dir ) => {
    return new Promise( ( resolve, reject ) => {
        // Getting the contents of the directory.
        glob( dir, ( err, files ) => {

            // Determining if there's an error and returning it.
            if ( err ) { reject( err ); }
            
            // Returning the file string array.
            resolve( files );
        } );
    } );
};

/**
 * Attempts to make a Twitter status update containing text and a video.
 */
const uploadVideo = async () => {
    // Twitter authentication information.
    const O_AUTH_INFO = {
        consumer_key: process.env.CONSUMER_KEY,
        consumer_secret: process.env.CONSUMER_KEY_SECRET,
        token: process.env.ACCESS_TOKEN,
        token_secret: process.env.ACCESS_TOKEN_SECRET
    };
    const TWEETER = new Tweeter(O_AUTH_INFO); // The Tweeter object.
    const MEDIA_DIR = './media'; // The directory containing the recorded videos.
    let videoFiles; // An array of paths to the recorded videos.
    let statusText; // The text for the twitter status.
    // The media file information.
    let mediaFile = {
        path: '',
        mimetype: 'video/mp4',
        media_category: 'tweet_video',
        media_id: '',
        state: ''
    };

    return new Promise(async (resolve, reject) => {
        try {
            // Getting the paths to the video files
            videoFiles = await getDirContents( MEDIA_DIR + '/*' );

            // Posting to twitter
            if ( videoFiles.length > 0 )
            {
                // There are files in the media directory. We will try to 
                // upload the first one.
                mediaFile.path = videoFiles[0];

                // Attempting to upload the video.
                mediaFile = await TWEETER.uploadMedia( mediaFile );

                // Querying the video uloaded successfully.
                switch ( mediaFile.state ) {
                    case 'succeeded':
                        // The video uploaded successfully so we're setting
                        // the text for the status update
                        statusText = 'Testing interval motion cam | '
                                    + new Date().toLocaleString( 'AU' );
                        
                        // Attatching the status-text and the uploaded video
                        // to a status update and printing the response
                        // from Twitter.
                        console.log(
                            await TWEETER.tweetTextAndMedia(
                                            statusText, 
                                            mediaFile.media_id
                                            )
                        );
                        break;
                    case 'failed':
                        // The video failed to upload so we're printing
                        // a message to say so.
                        console.log( "The video failed to upload" );
                        break;
                }

                // Deleting all the files in the media directory.
                console.log(
                    await deleteDirContents( MEDIA_DIR + '/*' )
                );
            }
            else {
                // There are no files in the media directory so we're
                // updating the twitter status with text only.
                statusText = 'Testing interval motion cam | '
                            + '| NO MOTION DETECTED | ' 
                            + new Date().toLocaleString('AU');
    
                // Attaching the text to a status update and printing the
                // response from Twitter.
                console.log( await TWEETER.tweetText( statusText ) );
            }
        }
        // Catching any errors and printing them.
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

// Running the program once initially.
run();

// Running the program at intervals.
setInterval( () => {
  run();
}, PARAMS.upload_freq );

