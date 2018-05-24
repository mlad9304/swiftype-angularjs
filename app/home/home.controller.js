(function () {

  'use strict';

  angular
    .module('app')
    .controller('HomeController', homeController)
    .filter('trustAsHtml',['$sce', function($sce) {
      return function(text) {
          return $sce.trustAsHtml(text);
      };
  }]);

  homeController.$inject = ['authService', '$scope', '$http', '$mdDialog', '$rootScope'];

  function homeController(authService, $scope, $http, $mdDialog, $rootScope) {

    $scope.from = 0;
    $scope.size = 12;
    $scope.categorySize = 5;
    $scope.isSavedSearches = false;

    $scope.isFacetFilter = false;
    $scope.isMultiFacetSelect = false;
    $scope.multiFacetsData = {};
    $scope.selectedMultiFacets = [];
    $scope.nickname = "";

    $scope.currentNavItem = 'web';

    var vm = this;
    vm.auth = authService;

    $scope.from_savedsearches = 0;
    $scope.size_savedsearches = 12;

    $scope.$watch(function(){
        return $rootScope.g_bIsAuth;
    }, function(newVal, oldVal){
        //do something with values
        if (newVal == true) getProfile();
    }) 


    const getProfile = () => {
        authService.getProfile(function(err, profile) {
            // vm.profile = profile;
            $scope.nickname = profile.nickname;
            $scope.email = profile.name;
            $scope.user = profile.sub.substr(6);
            $scope.isLogged = true;
            $scope.$apply();

            console.log(profile);
        });
    }    

    getProfile();

    $rootScope.saveResult = (item) => {

        if(item.isSaved)
            return;
        
        $http({
            method : "POST",
            url : `${SERVER_URL}/saveddoc/_doc`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "user": $scope.user,
                "date_created": new Date().toJSON(),
                "categories": [...item._source.categories],
                "title": item._source.title,
                "text": item._source.text
            }
        }).then((response) => {
            
            item.isSaved = true;
        },(error) => {
            console.log(error.statusText);
        });
    }

    $rootScope.removeResult = (item) => {

        $http({
            method : "DELETE",
            url : `${SERVER_URL}/saveddoc/_doc/${item._id}`,
            headers: {
                'Content-Type': 'application/json'
            },
        }).then((response) => {
            
            for(let i=0; i<$scope.hits.length; i++) {
                if(response.data._id === $scope.hits[i]._id) {
                    $scope.hits.splice(i, 1);
                    break;
                }
            }
        },(error) => {
            console.log(error.statusText);
        });
    }

    $scope.openMenu = function($mdMenu, ev) {
        $mdMenu.open(ev);
    };

    $scope.logout = () => {
        $scope.isLogged = false;
        $scope.currentNavItem = 'web';
        vm.auth.logout();
    }
    

    $scope.profile = function(ev) {

        $mdDialog.show({
            parent: angular.element(document.querySelector('#searchHeader')),
            targetEvent: ev,
            template:
              '<md-dialog aria-label="List dialog">' +
              '<md-toolbar>' +
                '<div class="md-toolbar-tools">' +
                    '<h2>Profile</h2>' +
                    // '<md-button class="md-icon-button" ng-click="cancel()">' +
                    // '<md-icon md-svg-src="img/icons/ic_close_24px.svg" aria-label="Close dialog"></md-icon>' +
                    // '</md-button>' +
                '</div>' +
              '</md-toolbar>' +
              '  <md-dialog-content>'+
              '    <md-list>'+
              '      <md-list-item>'+
              '       <p>Email: {{email}}</p>' +
              '      '+
              '      </md-list-item>'+
              '      <md-list-item>'+
              '       <p>Nickname: {{nickname}}</p>' +
              '      '+
              '      </md-list-item>'+
              '    </md-list>'+
              '  </md-dialog-content>' +
              '  <md-dialog-actions>' +
              '    <md-button ng-click="closeDialog()" class="md-primary">' +
              '      Got it!' +
              '    </md-button>' +
              '  </md-dialog-actions>' +
              '</md-dialog>',
            locals: {
                email: $scope.email,
                nickname: $scope.nickname
            },
            controller: function($scope, $mdDialog, email, nickname) {
                $scope.email = email;
                $scope.nickname = nickname;
                $scope.closeDialog = function() {
                  $mdDialog.hide();
                }
            }
         });
      };

    

    

    $scope.search = (isReplaceReturnedFacets=true, callback=null) => {
        console.log($scope.query);
        if($scope.query === '')
            return;

        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
                "aggs" : {
                    "index" : {
                        "terms" : { "field" : "_index" }
                    },
                    "category" : {
                        "terms" : { 
                            "field" : "categories.keyword", 
                            "size" : $scope.categorySize
                        },
                        
                    }
                },
            }
        }

        if($scope.isMySaves) {

            requestObj.url = `${SERVER_URL}/saveddoc/_search`;

            if($scope.isFacetFilter) {
                requestObj.data.query = {
                    "bool" : {
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": ($scope.isMultiFacetSelect ? $scope.selectedMultiFacets : [$scope.selectedFacetValue])
                            }
                        }
                    }
                };
            } else {
                requestObj.data.query = {
                    "bool" : {
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                };
            }
        } else {

            requestObj.url = `${SERVER_URL}/wiki/_search`;

            if($scope.isFacetFilter) {
                requestObj.data.query = {
                    "bool" : {
                        "must" : {
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": ($scope.isMultiFacetSelect ? $scope.selectedMultiFacets : [$scope.selectedFacetValue])
                            }
                        }
                    }
                };
            } else {
                requestObj.data.query = {
                    "bool" : {
                        "must" : {
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                };
            }
        }
        

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { category: categoryData, index } = searchResult.aggregations;
            const { buckets: categories } = categoryData;
            const { hits, total } = searchResult.hits;

            if(isReplaceReturnedFacets) {
                $scope.categories = categories;
                $("div.facet-container").find(".facet-option[data-facet-value='all']").addClass('selected');

                for(let i=0; i<categories.length; i++) {
                    $scope.multiFacetsData[categories[i].key] = false;
                }
            }
            $scope.index = index;
            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

            if(callback)
                callback();

        },(error) => {
            console.log(error.statusText);
        });

    }
    
    $scope.handleChangeQuery = () => {

        $scope.from = 0;
        $scope.isFacetFilter = false;
        $scope.isMultiFacetSelect = false;
        $scope.isSavedSearches = false;
        

        for(let val in $scope.multiFacetsData)
            $scope.multiFacetsData[val] = false;
        $scope.selectedMultiFacets = [];

        $scope.currentNavItem = 'web';
        $scope.isMySaves = false;
        $scope.isMySavedSearches = false;
        $scope.search();
        
    }
    
    $scope.prevPage = () => {
        $scope.from -= $scope.size;
        $scope.search(false);
    }
    $scope.nextPage = () => {
        $scope.from += $scope.size;
        $scope.search(false);
    }

    $scope.goto = (page) => {
        
        $scope.from = 0;
        $scope.isFacetFilter = false;
        $scope.isMultiFacetSelect = false;
        $scope.isSavedSearches = false;

        for(let val in $scope.multiFacetsData)
            $scope.multiFacetsData[val] = false;
        $scope.selectedMultiFacets = [];

        $scope.from_savedsearches = 0;

        if(page === 'savedresults') {
            $scope.isMySaves = true;
        } else
            $scope.isMySaves = false;

        if(page === 'savedsearches') {
            $scope.isMySavedSearches = true;
            $scope.searchSavedSearches();
            return;
        } else {
            $scope.isMySavedSearches = false;
        }
        
        $scope.search();
        
    }

    $scope.handleClickFacet = (e, facetValue) => {

        $scope.isMultiFacetSelect = false;
        for(let val in $scope.multiFacetsData) {
            $scope.multiFacetsData[val] = false;
        }
        $scope.selectedMultiFacets = [];

        $(e.target).parents(".facets").find('.facet-option').removeClass('selected');
        let el = angular.element(e.target.parentElement);
        el.addClass('selected');
        
        $scope.from = 0;
        $scope.isSavedSearches = false;

        let query = {};
        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
                query
            }
        };

        if($scope.isMySaves) {

            requestObj.url = `${SERVER_URL}/saveddoc/_search`

            if(facetValue === '_all') {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
                $scope.selectedFacetValue = '';
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": [
                                    facetValue
                                ]
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
                $scope.selectedFacetValue = facetValue;
            }
        } else {

            requestObj.url = `${SERVER_URL}/wiki/_search`;

            if(facetValue === '_all') {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": [
                                    facetValue
                                ]
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
                $scope.selectedFacetValue = facetValue;
            }
        }     

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { hits, total } = searchResult.hits;

            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

        },(error) => {
            console.log(error.statusText);
        });

    }

    $scope.handleClickMultiFacet = () => {
        $scope.isMultiFacetSelect = true;
        $("div.facet-container").find(".facet-option").removeClass('selected');

        $scope.selectedMultiFacets = [];
        for(let val in $scope.multiFacetsData) {
            if($scope.multiFacetsData[val])
                $scope.selectedMultiFacets.push(val);
        }

        $scope.from = 0;
        $scope.isSavedSearches = false;

        let requestObj = {
            method : "POST",
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from,
                "size": $scope.size,
            }
        };

        if($scope.isMySaves) {

            requestObj.url = `${SERVER_URL}/saveddoc/_search`;

            if($scope.selectedMultiFacets.length === 0) {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": $scope.selectedMultiFacets
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
            }
        } else {

            requestObj.url = `${SERVER_URL}/wiki/_search`;

            if($scope.selectedMultiFacets.length === 0) {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                    }
                }
    
                $scope.isFacetFilter = false;
            } else {
                requestObj.data.query = {
                    "bool":{
                        "must":{
                            "query_string" : {
                                "fields" : ["text"],
                                "query" : $scope.query
                            }
                        },
                        "filter":{
                            "terms":{
                                "categories.keyword": $scope.selectedMultiFacets
                            }
                        }
                    }
                }
                $scope.isFacetFilter = true;
            }
        }

        $http(requestObj).then((response) => {
            
            const searchResult = response.data;
            const { hits, total } = searchResult.hits;

            $scope.hits = hits;
            $scope.total = total;

            $scope.isNotEmptyRecords = $scope.total > 0;
            $scope.page_row_count_summary = ($scope.from + 1) + '-' + ($scope.from + $scope.hits.length);
            $scope.isInvalidPrevPage = $scope.from <= 0;
            $scope.isInvalidNextPage = ($scope.from + $scope.hits.length) >= $scope.total;

        },(error) => {
            console.log(error.statusText);
        });
    }

    $scope.onSaveSearches = (e) => {
        let categories = [];
        if($scope.isMultiFacetSelect) {
            for(let facetValue in $scope.multiFacetsData) {
                if($scope.multiFacetsData[facetValue])
                    categories.push(facetValue);
            }
        }
        else {
            console.log("aaa", $scope.selectedFacetValue);
            if($scope.selectedFacetValue !== undefined && $scope.selectedFacetValue !== '')
                categories.push($scope.selectedFacetValue);
        }

        $http({
            method : "POST",
            url : `${SERVER_URL}/savedsearch/_doc`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "user": $scope.user,
                "date_created": new Date().toJSON(),
                "query": $scope.query,
                "categories": categories,
                "is_multi_facet_select": $scope.isMultiFacetSelect
            }
        }).then((response) => {
            $scope.isSavedSearches = true;

            
        },(error) => {
            console.log(error.statusText);
        });

    }

    $scope.searchSavedSearches = () => {

        $http({
            method : "POST",
            url : `${SERVER_URL}/savedsearch/_search`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: {
                "from": $scope.from_savedsearches,
                "size": $scope.size_savedsearches,
                "query": {
                    "bool":{
                        "must": {
                            "match": {
                                "user": $scope.user
                            }
                        },
                    }
                }
            }
        }).then((response) => {

            const searchResult = response.data;
            const { hits, total } = searchResult.hits;

            $scope.hits_savedsearches = hits;
            $scope.total_savedsearches = total;

            $scope.isNotEmptyRecords_savedsearches = $scope.total_savedsearches > 0;
            $scope.page_row_count_summary_savedsearches = ($scope.from_savedsearches + 1) + '-' + ($scope.from_savedsearches + $scope.hits_savedsearches.length);
            $scope.isInvalidPrevPage_savedsearches = $scope.from_savedsearches <= 0;
            $scope.isInvalidNextPage_savedsearches = ($scope.from_savedsearches + $scope.hits_savedsearches.length) >= $scope.total_savedsearches;
            
        },(error) => {
            console.log(error.statusText);
        });
    }

    $scope.prevPageSavedsearches = () => {
        $scope.from_savedsearches -= $scope.size_savedsearches;
        $scope.searchSavedSearches();
    }
    $scope.nextPageSavedsearches = () => {
        $scope.from_savedsearches += $scope.size_savedsearches;
        $scope.searchSavedSearches();
    }

    $scope.viewSearches = (item) => {

        $scope.query = item._source.query;
        $rootScope.query = item._source.query;

        $scope.isMultiFacetSelect = item._source.is_multi_facet_select;

        $scope.from = 0;
        $scope.isFacetFilter = item._source.categories.length === 0 ? false : true;
        $scope.isMultiFacetSelect = item._source.is_multi_facet_select;
        $scope.isSavedSearches = false;

        if($scope.isFacetFilter) {
            if($scope.isMultiFacetSelect) {
                $scope.selectedMultiFacets = item._source.categories;
            } else {
                $scope.selectedFacetValue = item._source.categories[0];
            }
        } else {
            $scope.selectedFacetValue = "";
            $scope.multiFacetsData = {};
            $scope.selectedMultiFacets = [];
        }

        $scope.currentNavItem = 'web';
        $scope.isMySaves = false;

        $scope.isMySavedSearches = false;

        $scope.search(true, () => {
            $scope.multiFacetsData = {};

            if($scope.isFacetFilter) {
                if($scope.isMultiFacetSelect) {
                    for(let val in $scope.selectedMultiFacets)
                        $scope.multiFacetsData[$scope.selectedMultiFacets[val]] = true;

                    $("div.facet-container").find(".facet-option").removeClass('selected');
                } else {
                    if($scope.selectedFacetValue !== undefined && $scope.selectedFacetValue !== '') {
                        
                        let i;
                        for(i=0; i<$scope.categories.length; i++) {
                            if($scope.categories[i].key == $scope.selectedFacetValue)
                                break;
                        }
                        
                        setTimeout(() => {
                            $("div.facet-container").find(".facet-option").removeClass('selected');
                            $('div.facet-container:first .facet-option').eq(i+1).addClass('selected');
                        }, 100);
                    }
                }
            }
        });

    }
    $scope.removeSearches = (item) => {

        $http({
            method : "DELETE",
            url : `${SERVER_URL}/savedsearch/_doc/${item._id}`,
            headers: {
                'Content-Type': 'application/json'
            },
        }).then((response) => {
            
            for(let i=0; i<$scope.hits_savedsearches.length; i++) {
                if(response.data._id === $scope.hits_savedsearches[i]._id) {
                    $scope.hits_savedsearches.splice(i, 1);
                    break;
                }
            }
        },(error) => {
            console.log(error.statusText);
        });
    }

    $('body').on('click', function(e) {
        
        if ($(".btn_menu_vis").is(e.target)) {
            $(".btn_menu_vis").toggleClass('active');
        } else {
            $(".btn_menu_vis").removeClass('active');
        }

        if ($(".s-sidebar__trigger").is(e.target)) {
            $(".s-sidebar__trigger").toggleClass('active');
        } else {
            var element = document.getElementsByClassName("facets")[0];
            
            if(element !== undefined) {
                if(e.target !== element && !element.contains(e.target)){
                    $(".s-sidebar__trigger").removeClass('active');
                }
            }
            
        }
    });

    
  }

})();