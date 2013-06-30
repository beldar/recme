Places = new Meteor.Collection("places");
if (Meteor.isClient) {
  var geocoder;
  var map;
  var markers = [];
  var infos = [];
  var info = false;
  
  Meteor.startup(function(){
     Session.set("limit", 20);
     Session.set("active_mark", false);
     Session.set("userloc", false);
     $("#map").height($("#map").width());
     geocoder = new google.maps.Geocoder();
     var mapOptions = {
        zoom: 12,
        center: new google.maps.LatLng(51.507222, -0.1275),//51,51125, -0,11980
        mapTypeId: google.maps.MapTypeId.ROADMAP
      };
      map = new google.maps.Map(document.getElementById("map"), mapOptions); 
      $("#newplace").on('hidden', function(){
         $("#newplace input").val('');
         $("#newplace textarea").val('');
      });
      Deps.autorun(function(){
            var places = Places.find({});
            places.forEach(function(place){
                putMarker(place, false);
            });
        });
  });
  Template.main.events({
     "click #geome" : function(){
        navigator.geolocation.getCurrentPosition(success_callback, error_callback)
        return false;
     }
  });
  function success_callback(p){
        Session.set("userloc", {jb:p.coords.latitude, kb: p.coords.longitude});
        var latlng = new google.maps.LatLng(p.coords.latitude, p.coords.longitude);
        geocoder.geocode({'latLng': latlng}, function(results, status) {
            if (status === google.maps.GeocoderStatus.OK) {
              if (results[1]) {
                $("#newplace").modal('show');
                $("#address").val(results[1].formatted_address);
              }
            } else {
                $("#newplace").modal('show');
            }
         });
  }
  function error_callback(p){
        if(p.code === 1)
            alert("You said no?? Then why did you click 'Get my location' ??");
        else if(p.code === 2)
            alert("Can't contact the satellites! :(");
        else
            alert("Sorry I can't find you!");
  }
  Template.modal.events({
     "click #save" : function(){
         var name = $("#name").val();
         var placename = $("#placename").val();
         var address = $("#address").val();
         var why = $("#why").val();
         if(name === "" || placename === "" || address === "" || why === "")
             alert("Please fill up all fields.");
         else{
             var nid = Places.insert({name:name, placename:placename,address:address,why:why, created: moment().unix(), likes:0});
             if(!Session.get("userloc"))
                getCoords(address,nid);
             else{
                Places.update(nid, {$set:{formated_address:address, coords: Session.get("userloc")}}); 
                var mark = putMarker(nid, true);
                centerMarker(mark);
                Session.set("userloc", false);
             }
             $("#newplace").modal('hide');
         }
         return false;
     } 
  });
  Template.places.places = function(){
      return Places.find({},{sort:{created:-1}, limit: Session.get("limit")});
  }
  Template.places.therearemore = function(){
    return Places.find({}).count()>Session.get("limit");
  }
  Template.place.selected = function(){
      return Session.get("active_mark") === this._id ? "selected":"";
  }
  Template.place.timeago = function(){
      return moment('"'+this.created+'"',"X").fromNow();
  }
  Template.place.events({
     "click .place" : function(){
         if(info)
             info.close();
         centerMarker(markers[this._id]);
         info = infos[this._id];
         info.open(map, markers[this._id]);
         Session.set("active_mark", this._id);
         return false;
     },
     "click .likeme" : function(){
         Places.update({_id:this._id},{$inc:{likes:1}});
         return false;
     }
  });
  Template.places.events({
     "click #getmore" : function(e){
        e.preventDefault();
        var limit = Session.get("limit");
        limit += 20;
        Session.set("limit", limit);
        return false;
     }
  });
  function getCoords(address, nid){
        geocoder.geocode( { 'address': address}, function(results, status) {
          if (status === google.maps.GeocoderStatus.OK) {
            var fa = results[0].formatted_address;
            var coords = results[0].geometry.location;
            Places.update(nid, {$set:{formated_address:fa, coords: coords}});
            var mark = putMarker(nid, true);
            centerMarker(mark);
          } else {
            alert("Geocode was not successful for the following reason: " + status);
          }
        });
  }
  
  function putMarker(id, isel){
      if(isel)
        var p = Places.findOne({_id:id});
      else
        var p = id;
      if(typeof p !== 'undefined' && typeof p.coords !== 'undefined'){
            var myLatlng = new google.maps.LatLng(p.coords.jb,p.coords.kb);
            var marker = new google.maps.Marker({
                position: myLatlng,
                map: map,
                title:p.placename
            });
            var cs = '<h3>'+p.placename+' <small>sent by '+p.name+' '+moment('"'+p.created+'"',"X").fromNow()+'</small></h3><dl>';
            cs += '<dt>Address</dt><dd>'+p.address+'</dd>';
            cs += '<dt>Formatted Adress</dt><dd>'+p.formated_address+'</dd>';
            cs += '<dt>Why is special</dt><dd>'+p.why+'</dd>';
            cs += '<dt>Likes</dt><dd>'+p.likes+'</dd>';
            
            var infowindow = new google.maps.InfoWindow({
                content: cs,
                maxWidth: 200
            });
            markers[p._id] = marker;
            infos[p._id] = infowindow;
            google.maps.event.addListener(marker, 'click', function() {
              if(info)
                  info.close();
              infowindow.open(map,marker);
              Session.set("active_mark", p._id);
              info =  infowindow;
            });
            return marker;
      }else
          return false;
  }
  
  
  function centerMarker(mark){
      var latlng = mark.getPosition();
      map.setCenter(latlng);
      map.setZoom(12);
  }
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    // code to run on server at startup
  });
}
