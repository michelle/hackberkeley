var express = require('express');
var fs = require('fs');
var app =  express.createServer();

// Initialize main server
app.use(express.bodyParser());

app.use(express.static(__dirname + '/public'));

app.set('view engine', 'ejs');
app.set('views', __dirname + '/views');


app.get('/', function(req, res){
  res.render('index');
});

app.get('/sponsors', function(req, res){
  res.render('sponsors');
});


app.get('/projects', function(req, res){
  res.render('projects');
});

app.get('/people', function(req, res){
  res.render('people');
});

app.get('/media', function(req, res){
  res.render('media');
});

app.listen(80);


