require.paths.unshift('./node_modules')

var express = require('express');
var fs = require('fs');
var app =  express.createServer();
var https = require('https');

var mongo = require('mongoskin');

var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var people;
var projects;
var events;

function asorter(a, b) {
  return a.start_time-b.start_time;
}

function dsorter(a, b) {
  return b.start_time-a.start_time;
}

function formatDate(date) {
  var d = date;
  var hh = d.getHours();
  var m = d.getMinutes();
  var s = d.getSeconds();
  var dd = "AM";
  var h = hh;
  if (h >= 12) {
      h = hh-12;
      dd = "PM";
  }
  if (h == 0) {
      h = 12;
  }
  m = m<10?"0"+m:m;
  
  if(m == '00') {
    return h + dd;
  }
  
  s = s<10?"0"+s:s;


  var pattern = new RegExp("0?"+hh+":"+m+":"+s);
  return h+":"+m+dd;
}

function getPhotos(manyalbums) {
  console.log(manyalbums);
  for (var i in manyalbums) {
    var a = manyalbums[i];
    console.log(a);
    var aid = a['id'];
    var apath = '/' + aid + '/photos?access_token=AAACEdEose0cBAEVzEJbYhwJrH7DTFxBZBo7bo6yp5WQyaKok9pgL2nZAqgIy4SGC5HOXvthuijGSnjmLkZBVq0r09cSZCt53tmyEC4nUKlgArLZCufZA2B';
    https.get({
      host: 'graph.facebook.com',
      path: apath
    }, function(res) {
      console.log("hello2");
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          //console.log(album);
          a['photos'] = [];
          var data = JSON.parse(body);
          var pics = data['data'];
          console.log(pics);
          a['icon'] = pics[0]['picture'];
          for (var j in pics) {
            var photo = {};
            photo['source'] = pics[j]['source'];
            a['photos'].push(photo);
          }
          //console.log(currentalbum);
        } catch (error) {
          console.log(error.message);
        }
      }); 
    });
  }
}

function refreshCache () {
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('people').find().sort({'order':1}).toArray(function(err, items){
      people = items;
  });
  mongo.db('heroku:hackers@staff.mongohq.com:10065/app1491090').collection('projects').find().sort({'order':1}).toArray(function(err, items){
      projects = items;
  });
  

  https.get({
    host: 'graph.facebook.com',
    path: '/1295520723/albums?access_token=AAACEdEose0cBAPnV0h4jNfga8YLQcIPJxZAtmtvR4TVCCYPGJTQ7hy9MrTsPjvmCesFyNHq22huv6926PAHV4PcJIo208QxH2i2JJiidNiYSULrHa'
  }, function(res) {
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          albums = [];
          var album;
          var data = JSON.parse(body);
          for (var i in data['data']) {
            album = data['data'][i];
            if (album['name'].indexOf('@') != -1) {
              var currentalbum = {};
              currentalbum['name'] = album['name'].substring(4, album['name'].length);
              currentalbum['id'] = album['id'];
              
              albums.push(currentalbum);
            }
            
          }
          getPhotos(albums);
          selectedalbum = albums[4];
          
        } catch (error) {
          console.log(error.message);
        }
      });
  });

    
  
  https.get({
    host: 'api.facebook.com',
    path: '/method/events.get?uid=276905079008757&format=json&access_token=AAACDsVxgNQgBAIwkFjmFZAko2yF7iKDLsnGZCpLHY5ixs194Gf1hlVrMC7zWXIsxlZBiCRMZAB75kMAuZBG6aUomx7P46F9cZD'
  }, function(res) {
    var body = "";
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      try {
        var ts = Math.round((new Date()).getTime() / 1000);
        events = {new: [], old: []};
        var data = JSON.parse(body);
        
        var event, date;
        for(var i in data) {
          event = data[i];
          date = new Date((event.start_time  - 8 * 60 * 60) * 1000);
          event.date = months[date.getMonth()] + " " + date.getDate();
          event.time = formatDate(date);
          event.description = event.description.split('\n').shift();
          
          if(event.start_time > ts) {
            events.new.push(event);
          } else {
            events.old.push(event);
          }
        }
        
        events.new.sort(asorter);
        events.old.sort(dsorter);
        
      } catch (e){console.log(e.message)}
    });
  });

  setTimeout(refreshCache, 60000);
}
refreshCache();

// Initialize main server
app.use(express.bodyParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/home', function(req, res){
  res.render('home', {page: 'home', events: events});
});

app.get('/sponsors', function(req, res){
  res.render('sponsors', {page: 'sponsors'});
});


app.get('/events', function(req, res){
  res.render('events', {page: 'events', events: events});
});

app.get('/people', function(req, res){
  res.render('people', {page: 'people', people: people});
});

app.get('/media', function(req, res){
  res.render('media', {page: 'media', albums: albums});
});

app.get('/photos', function(req, res){
  res.render('photos', {page: 'media', current: selectedalbum});
});

app.listen(process.env.PORT || 8086);


