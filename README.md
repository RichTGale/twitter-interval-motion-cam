# twitter-interval-motion-cam
Records motion detected video at intervals and uploads it to twitter.

Notes: 
  - Code has only been tested using a Video4linux webcam device.
  - Code and instruction are written for use on standard Linux distributions such as Debian, Ubuntu and Rasbian.

Linux installation:

1. Install Nodejs: https://nodejs.org/

2. Install Motion: https://motion-project.github.io/motion_build.html

3. Open a command prompt and enter the following commands, replacing *username* with your username:
    - cd /home/*username*/
    - git clone https://github.com/srcarry/twitter-interval-motion-cam.git
    - cd /home/*username*/twitter-interval-motion-cam/
    - npm install child_process
    - npm install dotenv
    - npm install fs-extra
    - npm install glob
    - npm install nedb
    - npm install request
  
4. Replace *<username>* in the base_path attribute value on line 174 of index.js with your local username.

5. Still in the 'twitter-interval-motion-cam' directory, create a file and name it '.env'. Edit the file to include these variables: 
    - CONSUMER_KEY 
    - CONSUMER_KEY_SECRET
    - ACCESS_TOKEN
    - ACCESS_TOKEN_SECRET
  
    and assign them the keys Twitter gave you after registering your app. Here's an example:

    CONSUMER_KEY=owi3h0r2q0hjje0i
    CONSUMER_KEY_SECRET=1qojer-0912e-1iwe-1q02e23098h12038j2
    ACCESS_TOKEN=01qioje02w9ej01q92jee
    ACCESS_TOKEN_SECRET=02i3j02qwij2d0iw2je0i2j03498u0w2rf2w

    - Save the file.

6. In the same directory, create a folder called 'storage-temp'.

7. Replace *<username>* on line 450 of motion.conf with your username.
  
8. Plug in your camera. Make sure you only have 1 camera plugged in.
  
9. In a command prompt in the same directory type the command: *sudo node index.js*

10. Wait a few minutes and and view your video on Twitter depending on whether motion was detected.

Optional:
  - Change camera overlay text on lines 405 and 410 of motion.conf
  - Change camera resolution at lines 100 and 103 of motion.conf
  - Change how often tweets are made (in milliseconds) on line 232 of index.js
