// here's some regex to match links , @mentions, and punctuation
var urlRegex = /(\b(https?|ftp|file):\/\/[-A-Z0-9+&@#\/%?=~_|!:,.;]*[-A-Z0-9+&@#\/%=~_|])/ig,
    atMentionRegex = /@(.*)\s/ig,
    allPunctRegex = /[.,\/#!$%\^&\*;?:{}=\-_`~()]/,
    sentenceEndingPunctRegex = /[.!?)]/,
    Twit = require('twit'),
    MarkovChain = require('markovchain'),
    fs = require('fs'),
    aBunchOfNouns = JSON.parse(fs.readFileSync('./nouns.json', 'utf8')).nouns, // h/t @tinysubversions
    config = require('./config.js')

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
    // I know you're thinking this should be at higher scope. Maybe?
    var tweets = new MarkovChain(fs.readFileSync('./tweets.txt', 'utf8').replace(urlRegex,'').replace(atMentionRegex,''))
     
    var generatedTweet = tweets.start(useUpperCase).end(endBotTweet).process()

    // that punctuation tho
    if (generatedTweet.slice(-1).match(sentenceEndingPunctRegex) === null) { 
        // we didn't luck into punctuation at the end of the sentence, so add a period
        //but first make sure we don't have some other punctuation
        if (generatedTweet.slice(-1).match(allPunctRegex)) {
            generatedTweet = generatedTweet.slice(0, -1)
        }
        generatedTweet += '.'
    }
    
    // ok tweet it
    T.post('statuses/update', { status: generatedTweet }, function(err, data, response) {
      console.log(data)
    })
}

// here we go
setInterval(function() {
    makeATweet();
}, config.settings.tweetInterval);


