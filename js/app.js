(function ($) {
  "use strict"

  /*************************************************
   *                                               *
   * CODE THAT DEALS WITH THE FACEBOOK LOGIN       *
   *                                               *
   *************************************************
   */
   var user_friends;
   window.fbAsyncInit = function() {
    FB.init({
    appId      : '526349567437769', // App ID
    //    channelUrl : 'localhost:3000/users/new', // Channel File
    status     : true, // check login status
    cookie     : true, // enable cookies to allow the server to access the session
    xfbml      : true  // parse XFBML
  });

  // Here we subscribe to the auth.authResponseChange JavaScript event. This event is fired
  // for any authentication related change, such as login, logout or session refresh. This means that
  // whenever someone who was previously logged out tries to log in again, the correct case below
  // will be handled.
  FB.Event.subscribe('auth.authResponseChange', function(response) {
    console.log("Called FB.event.subscribe");
    // Here we specify what we do with the response anytime this event occurs.
    if (response.status === 'connected') {

      // The response object is returned with a status field that lets the app know the nt
      // login status of the person. In this case, we're handling the situation where they
      // have logged in to the app.
      testAPI();
    } else if (response.status === 'not_authorized') {
      // In this case, the person is logged into Facebook, but not into the app, so we call
      // FB.login() to prompt them to do so.
      // In real-life usage, you wouldn't want to immediately prompt someone to login
      // like this, for two reasons:
      // (1) JavaScript created popup windows are blocked by most browsers unless they
      // result from direct interaction from people using the app (such as a mouse click)
      // (2) it is a bad experience to be continually prompted to login upon page load.
      FB.login(function(response) {
        // handle the response
        console.log("The user is not_authorized");
      }, {scope: 'email,read_friendlists'});
    } else {
      // In this case, the person is not logged into Facebook, so we call the login()
      // function to prompt them to do so. Note that at this stage there is no indication
      // of whether they are logged into the app. If they aren't then they'll see the Login
      // dialog right after they log in to Facebook.
      // The same caveats as above apply to the FB.login() call here.
      FB.login(function(response) {
        // handle the response
        console.log("The user is not logged into facebook");
      }, {scope: 'email,read_friendlists'});
    }
  });
};

  // Load the SDK asynchronously
  (function(d){
   var js, id = 'facebook-jssdk', ref = d.getElementsByTagName('script')[0];
   if (d.getElementById(id)) {return;}
   js = d.createElement('script'); js.id = id; js.async = true;
   js.src = "//connect.facebook.net/en_US/all.js";
   ref.parentNode.insertBefore(js, ref);
 }(document));

  // Here we run a very simple test of the Graph API after login is successful.
  // This testAPI() function is only called in those cases.
  function testAPI() {
    console.log('Welcome!  Fetching your information.... ');
    FB.api('/me/friends', function(response) {
      // console.log(JSON.stringify(response.data));
      user_friends = response.data;
    });
  }



  /**************************************************************
   *                                                            *
   * END FACEBOOK API CODE                                      *
   * BEGIN BACKBONE CODE                                        *
   *                                                            *
   **************************************************************
   */

   var Friend = Backbone.Model.extend({
    defaults: {
      name: "",
      id: 0,
      amountOwed: 0
    }
  });

   var FriendsList = Backbone.Collection.extend({
    model: Friend
  });

   var SelectedFriendView = Backbone.View.extend({
    tagName: "selectedFriend",
    className: "selectedFriend-container",
    template: _.template($("#personSplitTemplate").html()),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    events: {
      "click button.delete": "deleteContact"
    },

    deleteContact: function() {
      this.model.destroy();
      this.remove();

      // add code to update the amount that people owe you

    }
  })


   var MasterView = Backbone.View.extend({
    el: $("#venmoMe"),

    initialize: function() {
      this.$el.find("#splitMoney").hide();
      this.allFriends = null;
      this.selectedFriends = new FriendsList();
      this.selectedFriends.on("add", this.renderFriend, this);

      /* Limits the number of results for
       * search your facebook friends so it doesn't
       * slow down too much
       */
       this.searchLimit = 10;
     },

     events: {
      "click #buttonHolder": "showForm",
      "keyup #firstName" : "handleSearch",
      "click .addPerson" : "addPerson",
      "keyup #totalAmount" : "handleTotal"
    },

    handleTotal: function(e) {
      if (this.selectedFriends.length != 0) {
        var numFriends = this.selectedFriends.length;
        var totalAmount = parseInt(e.currentTarget.value);
        _.each(this.selectedFriends, function(friend) {
          // set the friend's amount owed to totalAmount/numFriends.toFixed(2)
        })
      }
    },

    renderFriend: function(item) {
      var newFriendView = new SelectedFriendView({
        model:item
      });
      $(this.el).append(newFriendView.render().el);
    },

    handleSearch: function(e) {

      // Prevent the default action so my backbone code can run!
      e.preventDefault();

      // In case the user starts typing in names before
      // we can get the user's friend information from facebook.
      if (this.allFriends == null && user_friends != null) this.allFriends = new FriendsList(user_friends);

      // Reset the results each time
      this.$el.find("#addName").empty();

      this.search = e.currentTarget.value;
      this.matches = 0;

      if (e.currentTarget.value.length != 0) {
        var filtered = _.filter(this.allFriends.models, function(item) {
          if (this.matches >= this.searchLimit) return false;
          var match = item.get("name").toLowerCase().indexOf(this.search.toLowerCase()) >= 0;
          if (match) this.matches++;
          return match && this.matches <= this.searchLimit;
        }, this);

      // Dynamically update the page as the results are filtered
      _.each(filtered, function(item) {
        $('<button/>', {
          class: 'addPerson btn btn-info',
          href: '#',
          id: item.get("id"),
          value: item.get("name"),
          text: item.get("name")
        }).appendTo('#addName');
      })
    }
  },

  showForm: function() {
    this.$el.find("#splitMoney").slideToggle();
    if (user_friends != null) this.allFriends = new FriendsList(user_friends);
  },

  // Handles the backend logic behind adding someone to
  // the list of people who owe you money
  addPerson: function(e) {
    e.preventDefault();

    // create the object for the new friend
    var newFriend = {};
    newFriend["name"] = e.currentTarget.value;
    newFriend["id"] = e.currentTarget.id;

    console.log("Name: " + e.currentTarget.value + "ID: " + e.currentTarget.id);

    // If the collection doesn't already exist, create it
    // using an array with our new entry
    this.selectedFriends.add(new Friend(newFriend));
  }
});

var directory = new MasterView();
} (jQuery));
