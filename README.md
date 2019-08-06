# twitter-interval-motion-cam
Records motion detected video at intervals and uploads it to twitter.

Instructions:

1. open a command prompt and enter the following commands:

  - cd /home/*username*/
  - git clone https://github.com/drowsybot/twitter-interval-motion-cam.git
  - cd /home/*username*/twitter-interval-motion-cam/
  - npm install child_process
  - npm install dotenv
  - npm install fs-extra
  - npm install glob
  - npm install nedb
  - npm install request
  
2. Replace *username* in the base_path attribute value on line 148 of index.js with your local username.

3. Still in the 'twitter-interval-motion-cam' directory, create a file called '.env'. Edit the file to include these variables: CONSUMER_KEY, CONSUMER_KEY_SECRET, ACCESS_TOKEN and ACCESS_TOKEN_SECRET and assign them the keys Twitter gave you after registering your app (Example: CONSUMER_KEY=hr398r2038r0hf2). Save the .env file.

4. In the same directory create a folder called 'storage-temp'.
  
4. Plug in your camera. Make sure you only have 1 camera plugged in.
  
5. In a command prompt in the same directory type the command: *sudo node index.js*

5. Wait a few minutesand and view your video on Twitter.
