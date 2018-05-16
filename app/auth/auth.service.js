(function () {

  'use strict';

  angular
    .module('app')
    .service('authService', authService);

  authService.$inject = ['$state', 'angularAuth0', '$timeout', '$rootScope'];

  function authService($state, angularAuth0, $timeout, $rootScope) {

    $rootScope.g_bIsAuth = false;

    function login() {
      angularAuth0.authorize();
    }
    
    function handleAuthentication() {
      angularAuth0.parseHash(function(err, authResult) {
        if (authResult && authResult.accessToken && authResult.idToken) {
          setSession(authResult);
          $rootScope.g_bIsAuth = true;
          $rootScope.userid = authResult.sub;
          console.log(authResult);
          $state.go('home');
        } else if (err) {
          $timeout(function() {
            $state.go('home');
          });
          console.log(err);
          alert('Error: ' + err.error + '. Check the console for further details.');
        }
      });
    }

    function setSession(authResult) {
      // Set the time that the access token will expire at
      let expiresAt = JSON.stringify((authResult.expiresIn * 1000) + new Date().getTime());
      localStorage.setItem('access_token', authResult.accessToken);
      localStorage.setItem('id_token', authResult.idToken);
      localStorage.setItem('expires_at', expiresAt);
    }
    
    function logout() {
      // Remove tokens and expiry time from localStorage
      localStorage.removeItem('access_token');
      localStorage.removeItem('id_token');
      localStorage.removeItem('expires_at');
      $state.go('home');
    }
    
    function isAuthenticated() {
      // Check whether the current time is past the 
      // access token's expiry time
      let expiresAt = JSON.parse(localStorage.getItem('expires_at'));
      return new Date().getTime() < expiresAt;
    }

    function getProfile(cb) {
      var accessToken = localStorage.getItem('access_token');
      if (!accessToken) {
        // throw new Error('Access Token must exist to fetch profile');
        return;
      }
      angularAuth0.client.userInfo(accessToken, function(err, profile) {
        cb(err, profile);
      });
    }

    return {
      login: login,
      handleAuthentication: handleAuthentication,
      logout: logout,
      isAuthenticated: isAuthenticated,
      getProfile: getProfile,
    }
  }
})();
