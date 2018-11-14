// Tori Sherrod
// RESTful API Mongo Server
// Amazon Reviews

var http = require('http');
var path = require('path');

var async = require('async');
var socketio = require('socket.io');
var express = require('express');

var bodyparser = require('body-parser');
var jsonparser = bodyparser.json();

//var getdata = require('test_data/getdata.json');
//var postdata = require('test_data/postdata.json');

var router = express();
var server = http.createServer(router);
var io = socketio.listen(server);
var mongoClient = require('mongodb').MongoClient;
var url= "mongodb://omega.unasec.info/amazon";


router.use(express.static(path.resolve(__dirname, 'client')));
//var messages = [];
//var sockets = [];

mongoClient.connect(url, {useNewURLParser:true}, function(err,db){
  if (err) throw err;
  
  var dbo = db.db("amazon");   
  var collection = dbo.collection('reviews');
  
  //Get a review
  router.get('/review/:reviewid', jsonparser, function(req, res){
    //res.json(getdata);
    collection.aggregate([{$match: {"review.id": `${req.params.reviewid}`}}]).toArray(function(err, results) {
    if(!err) {
        res.json(results);
    }
    else {
        res.send(err);
        db.close();
    }
  });
  });
  
  //Get random reviews by stars
  router.get('/review/random/:n/:stars', function(req, res){
    //res.json(getdata);
    var stars = parseInt(req.params.stars);
    var review_num = parseInt(req.params.n);
    collection.aggregate([{$match: {"review.star_rating": stars }}, 
    { $sample: { size: review_num } }]).toArray(function(err, results) { 
    if(!err) {
        res.json(results);
    }
    else {
        res.send(err);
        db.close();
    }
     });
    });
    
    
    
    //Get random reviews by date
  router.get('/review/:n/:from_date/:to_date', function(res, req){
    //res.json(getdata);
    var from = new Date(req.params.from_date);
    var to = new Date(req.params.to_date);
    var review_num = parseInt(req.params.n);
    
    collection.aggregate([
      {$match: 
        {$and:[
          {"review.date": {$gte : from}}, 
          {"review.date": {$lte: to}}
          ]}
      }, 
      {$sample: 
        { size: review_num }}]).toArray(function(err, results) { 
          if(!err) {
              res.json(results);
          }
          else {
              res.send(err);
              db.close();
          }
         });
  
  });
  
  
  
//Add a review
  router.post('/review', jsonparser, function(req, res) {
    //res.json(postdata);
    if(!req.body) return res.sendStatus(400);
    
    collection.insertOne(req.body, function(err,results){
      if(err) throw err;
      res.json(results);
      db.close();
    });
  });
  
  
//Update a review
  router.put('/review/:reviewid', jsonparser, function(req, res){
   // res.json(postdata);
   
   var filter = {"review.id" : req.params.reviewid};
   var newVals = {$set: req.body};
   collection.updateMany (filter, newVals, {multi: false}, function(err, results){
     if (err) throw err;
     res.send(results);
     db.close();
   });
  });
  

//Delete a review
  router.delete('/review/:reviewid', jsonparser, function(req, res){
    var query = {"review.id" : '${req.params.reviewid}' };
    
    collection.deleteMany(query, function(err,obj){
      if(err) throw err;
      db.close();
    });
  });
  
  
//Average review stars over time
  router.get('/review/:from/:to', jsonparser, function(req,res){
    var from = new Date(`${req.params.from}`);
    var to = new Date(`${req.params.to}`);
    
    collection.aggregate([
      {$limit: 1000000},
      { $match:
        { "review.date" : {$gte: from, $lte: to} }
      },
      { $group:
        { 
          _id: null,
          avgstars: {$avg: "$review.star_rating"}
        }
      }
    ]).toArray(function(err,results){
      if(!err){
        res.json(results);
      }
      else{
        res.send(err);
        db.close();
      }
    });
  });
  

//helpful votes by product
  router.get('/review/helpful/:prodid', jsonparser, function(res, req){
    collection.aggregate([ 
        { $limit : 1000000 }, 
        { $match : { "product.id" : `${req.params.prodid}` }}, 
        { 
          $group: 
            { 
              _id: null, 
              avgHelpfulVotes: { $avg : "$votes.helpful_votes" } 
              
            }
        }
        ]).toArray(function(err, results) { 
      if(!err) {
          /*console.log(results.length);
          for(var i = 0; i < results.length; i++) {
            console.log(results[i]);
          }*/
          res.json(results);
      }
      else {
          res.send(err);
          db.close();
      }
        });
  });
  
//average review info for customer by category
  router.get('/review/info/:custid', jsonparser, function(req,res){
    collection.aggregate([
        { $limit : 1000000 },
        {
            $match: { customer_id : `${req.params.custid}` } 
        }, 
        { 
            $group: 
            { 
                _id: "$product.category", 
                avgStars: { $avg : "$review.star_rating" }, 
                avgHelpfulVotes: { $avg : "$votes.helpful_votes" },
                avgTotalVotes: { $avg : "$votes.total_votes" }
            } 
        } 
    ]).toArray(function(err, results) { 
      if(!err) {
          res.json(results);
      }
      else {
        res.send(err);
        db.close();
      }
    });
  });
  


server.listen(process.env.PORT || 3000, process.env.IP || "0.0.0.0", function(){
  var addr = server.address();
  console.log("Chat server listening at", addr.address + ":" + addr.port);
});
});