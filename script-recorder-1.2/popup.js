var app = angular.module('loggerApp', [])
.config( [
    '$compileProvider',
    function( $compileProvider )
    {   
        $compileProvider.aHrefSanitizationWhitelist(/^\s*(https?|ftp|mailto|chrome-extension|data):/);
        // Angular before v1.2 uses $compileProvider.urlSanitizationWhitelist(...)
    }
]);
app.controller('appCtrl', function($scope, $http) {
  $scope.logs = [];
  $scope.isRecording = false;
  $scope.tabId = -1;

  $scope.recordActionStatus = false;
  $scope.stopRecordActionStatus = false;
  $scope.jsonContent = "data:text/csv;charset=utf-8," + encodeURIComponent("");

  $scope.record = function() {
    if($scope.isRecording) {
      return;
    }

    if($scope.tabId === -1) {
      console.error('Oops tabId is -1!');
      return;
    }
    $scope.recordActionStatus = true;
    chrome.runtime.sendMessage({tabId: $scope.tabId, message: "register"}, function(response) {
      $scope.$apply(function(){
        $scope.isRecording = true;
        $scope.recordActionStatus = false;
      });
    });
  };

  $scope.stopRecording = function() {
    if(!$scope.isRecording) {
      console.error("Skipping command...");
      return;
    }

    $scope.stopRecordActionStatus = true;
    chrome.runtime.sendMessage({tabId: $scope.tabId, message: "unregister"}, function(response) {
      $scope.$apply(function(){
        $scope.isRecording = false;
        $scope.stopRecordActionStatus = false;
      });
    });
  };

  $scope.fetchRecordingStatus = function() {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      // Cache tabId, not likely to change
      $scope.tabId = tabs[0].id;
      chrome.runtime.sendMessage({tabId: $scope.tabId, message: "fetchRecordingStatus"}, function(response) {
        $scope.$apply(function(){
          $scope.isRecording = response.isRecording;
          $scope.fetchLogs();
        });
      });
    });
  };

  $scope.findName = function(url) {
    var lI = url.lastIndexOf("/");
    return url.substring(lI, url.length);
  };

  $scope.fetchLogs = function() {
    if(!$scope.isRecording) {
      return;
    }

    chrome.runtime.sendMessage({tabId: $scope.tabId, message: "fetchLogs"}, function(response) {
      $scope.$apply(function(){
          $scope.logs = response.data;

          generateDataRecord();
      });
    });
  };

  chrome.runtime.onConnect.addListener(function(port) {
  port.onMessage.addListener(function(msg) {
        $scope.$apply(function(){
            $scope.logs.push(msg);

            generateDataRecord();
        });
  });

});

function generateDataRecord(){
  $scope.logs.forEach(function(dataItem, index){
    var jsonObject = {
          method: dataItem.method,
          url: dataItem.url,
          type: dataItem.type,
          status: dataItem.status,
          fromCache: dataItem.fromCache
    }
    $scope.jsonContent += JSON.stringify(jsonObject);
  });
}

  //TODO this won't work, cause race condition need promise
  $scope.fetchRecordingStatus();
  //$scope.fetchLogs();
});