module.exports = {
    twitter: {
        consumer_key: 'xxx',
        consumer_secret: 'xxx',
        access_token: 'xxx',
        access_token_secret: 'xxx',
        timeout_ms: 60*1000,  // optional HTTP request timeout to apply to all requests. 
    },
    mysql: {
      host     : 'localhost',
      user     : 'me',
      password : 'secret',
      database : 'my_db'
    },
    settings: {
        tweetInterval: 3600 * 1000 // seconds * 1000 because javascript. 3600 = 1 hr.
    }
}