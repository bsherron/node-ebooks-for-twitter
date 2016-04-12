// here's some regex to match links , @mentions, and punctuation
var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
    atMentionRegex = /@(.*?)\s/ig,
    allPunctRegex = /[.,\/#!$%\^&\*;?:{}=\-_`~()]/,
    sentenceEndingPunctRegex = /[.!?)]/,
    Twit = require('twit'),
    MarkovChain = require('markovchain'),
    Promise = require('bluebird'),
    fs = require('fs'),
    mysql = require('promise-mysql'),
    aBunchOfNouns = JSON.parse(fs.readFileSync('./nouns.json', 'utf8')).nouns, // h/t @tinysubversions
    linesOfTweets,
    config = require('./config.js'),
    connection 
    

 
 
var normalizeTweet = function(rawTweet) {
    // takes each tweets and preps it for the markov chainer
    var improvedTweet
    //strip urls, @mentions, newlines
    improvedTweet = rawTweet.replace(urlRegex,'').replace(atMentionRegex,'').replace(/(\r\n|\n|\r)/gm," ").replace("  ", " ")
    return improvedTweet
}

var normalizeWord = function(word) {
    // do stuff to each word
    //airquotes
    if (word.slice(-1) == '"') {
        word = '"' + word
    } else if (word.slice(0,1) == '"') {
        word = word + '"' 
    } else if (word.slice(-1) == '”') {
        word = '“' + word
    } else if (word.slice(0,1) == '“') {
        word = word + '”' 
    }
    
    //airparens
    if (word.slice(-1) == ')') {
        word = '(' + word
    } else if (word.slice(0,1) == '(') {
        word = word + ')' 
    }
    
    // drop brackets
    word = word.replace(/\[|\]/g, '')
    return word
}
 
var buildMarkovChain = function(callback) {
    
    // make that mysql connection
    mysql.createConnection({
          host     : config.mysql.host,
          user     : config.mysql.user,
          password : config.mysql.password,
          database : config.mysql.database,
     }).then( function(connection) {
         
         connection.query('select text from tweets where retweeted_status_id is null;').then( function(rows) {
             var lines = "";
             for (var i = 0; i < rows.length; i++) {
                 lines += normalizeTweet(rows[i].text) + "\n"
             }
             callback(null, new MarkovChain(lines, normalizeWord))
             connection.end()
         })
     })
}

//set up a Twit object
var T = new Twit({
    consumer_key: config.twitter.consumer_key,
    consumer_secret: config.twitter.consumer_secret,
    access_token: config.twitter.access_token,
    access_token_secret: config.twitter.access_token_secret
});


// I'll start with an uppercase word because that reasonably likely to start a sentence in a real tweete
var useUpperCase = function(wordList) { 
    var tmpList = Object.keys(wordList).filter(function(word) {
        return word[0] >= 'A' && word[0] <= 'Z'
    })
    tmpList.push('tfw') // lol
    return tmpList[~~(Math.random()*tmpList.length)]
}

//any old word will do
var randomStartWord = function(wordList) {
    var tmpList = Object.keys(wordList)
    return tmpList[~~(Math.random()*tmpList.length)]
}

// gotta stop somewhere
var endBotTweet = function(sentence) {
    sentenceWords = sentence.split(" ")
    lastWord = sentenceWords[sentenceWords.length - 1]
    if (sentence.length > 110 && aBunchOfNouns.indexOf(lastWord) !== -1) {
        // long enough and ending with a noun
        return true
    } else if (sentence.length > 130) { 
        //it's a tweet, don't go crazy
        return true
    } else if (sentence.slice(-1).match(sentenceEndingPunctRegex) !== null) { 
        // there's sentence-ending punctuation
        return true
    }
    return false
}

// this does the work
var makeATweet = function() {
    
    var generatedTweet = ''
    var getMarkovChain = Promise.promisify(buildMarkovChain)
    getMarkovChain().then( function(chain) {
        
        generatedTweet = chain.start(randomStartWord).end(endBotTweet).process()
        // that punctuation tho
        if (generatedTweet.slice(-1).match(sentenceEndingPunctRegex) === null) { 
            // we didn't luck into punctuation at the end of the sentence, so add a period
            //but first make sure we don't have some other punctuation
            if (generatedTweet.slice(-1).match(allPunctRegex)) {
                generatedTweet = generatedTweet.slice(0, -1)
            }
            generatedTweet += '.'
        }
        
        // uppercase me
        generatedTweet = generatedTweet.charAt(0).toUpperCase() + generatedTweet.slice(1);
        
        //console.log(generatedTweet);
        // ok tweet it
        T.post('statuses/update', { status: generatedTweet }, function(err, data, response) {
            console.log(data)
        })
    })    
}


//fire one off for grins
makeATweet();

// now loop it
setInterval(function() {
     makeATweet();
}, config.settings.tweetInterval)


