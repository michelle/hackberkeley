var express = require('express');
var fs = require('fs');
var app =  express.createServer();
var https = require('https');
var mongo = require('mongoskin');
var months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

var people;
var projects;
var events;


// sort comparators for unix timestamps
function asorterTimestamp(a, b) {
  return a - b;
}

function dsorterTimestamp(a, b) {
  return b - a;
}

// sort comparers for date strings
function asorter(a, b) {
  return getTime(a.start_time)-getTime(b.start_time);
}

function dsorter(a, b) {
  return getTime(b.start_time)-getTime(a.start_time);
}

function getTime(a) {
  return new Date(a).getTime();
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
  
  for (var j in manyalbums) {
    var inline_function = function(i) {
      var a = manyalbums[i];
      var aid = a['id'];
      var currpic = photographs[aid]['photos'] = [];
      
      var apath = '/' + aid + '/photos?limit=200&access_token=AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCuG6oZD';
      https.get({
        host: 'graph.facebook.com',
        path: apath
      }, function(res) {
          var body = "";
          res.on('data', function(chunk) {
          body += chunk;
        });
        res.on('end', function() {
          try {
            
            var data = JSON.parse(body);
            var pics = data['data'];
            a['icon'] = pics[0]['picture'];
            for (var j in pics) {
              var photo = {};
              photo['source'] = pics[j]['source'];
              currpic.push(photo);
            }
          } catch (error) {
            console.log(error.message);
          }
        }); 
      });
    }
    inline_function(j);
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
    path: '/1295520723/albums?access_token=AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCuG6oZD&limit=2500&until=13114601440&__paging_token=2035970260967'
  }, function(res) {
      var body = "";
      res.on('data', function(chunk) {
        body += chunk;
      });
      res.on('end', function() {
        try {
          albums = [];
          photographs = {};
          var album;
          var data = JSON.parse(body);
          for (var i in data['data']) {
            album = data['data'][i];
            if (album['name'].indexOf('@') != -1) {
              var currentalbum = {};
              
              currentalbum['name'] = album['name'].substring(4, album['name'].length);
              currentalbum['id'] = album['id'];
              
              currentid = album['id'];
              
              photographs[currentid] = [];
              photographs[currentid]['name'] = currentalbum['name'];
              
              albums.push(currentalbum);
            }
            
          }
          getPhotos(albums);
          
          
        } catch (error) {
          console.log(error.message);
        }
      });
  });

    
  
  https.get({
    host: 'graph.facebook.com',
    path: 'https://graph.facebook.com/me/events?access_token=AAAD3shybXjYBAJeBIpg6uKS1edUGvHnZBo7Otf65QfBaFNk3FQCAAWb6D2ILICPb0xDeU4ZAM9BrcDGSw6t5wP9ZCCuG6oZD&limit=925&until=13321836000&__paging_token=301710103229855'
  }, function(res) {
    var body = "";
    res.on('data', function(chunk){
      body += chunk;
    });
    res.on('end', function(){
      try {
        var ts = (new Date()).valueOf();
        events = {new: [], old: []};
        data = JSON.parse(body).data;
        
        var event, date;
        for(var i in data) {
          event = data[i];
          // assumes that title contains @ iff it is an H@B event
          if( event.name.indexOf("@") != -1 && event.name != undefined) {
            console.log(event.name);
            // gets a more detailed event object
            https.get({
              host: 'graph.facebook.com',
              path: event.id
            }, function(res) {
              body = "",
              res.on('data', function(chunk){
                body += chunk;
              });
              res.on('end', function() {
                if( body == "false") {
                  return;
                }
                console.log(body);
                event = JSON.parse(body); 
                date = new Date(event.start_time);
                event.date = months[date.getMonth()] + " " + date.getDate();
                event.dateObj = date;
                event.time = formatDate(date);
                if( event.description != undefined ) {
                  event.description = event.description.split('\n').shift();
                }
                event.pic_url = "https://graph.facebook.com/" + event.id + "/picture?type=large"
                if( event.name.indexOf("Big Hack") >= 0) {
                  event.pic_url = "/images/events/bighack.png";
                }
                if(event.dateObj.valueOf() > ts) {
                  events.new.push(event);
                } else {
                  events.old.push(event);
                }

                // sorts the events every time. this may be ineffecient depending on what the sorting algorithm is and could be refactored
                events.new.sort(asorter);
                events.old.sort(dsorter);
              });
            });

          }
        }


      } catch (e){console.log(e.message)}
    });
  });

  setTimeout(refreshCache, 2000);
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

app.get('/media/:id', function(req, res){
  var pid = req.params.id;
  var p = photographs[pid];
  if (p != undefined) {
    res.render('photos', {page: 'media', current: p});
  } else {
    res.redirect('/media');
  }

});

app.listen(process.env.PORT || 8086);


