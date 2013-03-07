ImageStorage.js
===

ImageStorage.js is a simple library for using PNG images as string key value pair data holders

Example Usage:
----
```JavaScript
var imgStore = ImageStorage.loadFromURL("duck.png");
var imgStore = ImageStorage.loadFromImage($('#duckImg').get(0));
var imgStore = new ImageStore(new Uint8Array([...]));

imgStore.set("foo","bar");
imgStore.get("foo");
imgStore.remove("blah");

imgStore.save(function(img){
    //do something with image+data
});
```

Important Notes:
---
* This library requires support for Uint8Array
* Key value pairs stored as tEXt chunks
* There are many types of PNG specs, this may not work with all
* Many image hosting services pngcrush/reduce/modify images to reduce size
* Have fun!
