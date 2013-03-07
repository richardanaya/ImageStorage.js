var ImageStorage = function (data) {
    this.kvp = {};
    var _this = this;
    this.data = data;
    this.forEachTextChunk(function (k, v) {
        _this.set(k, v);
    });
};

ImageStorage.CHUNK_START = 8;

ImageStorage.loadFromImage = function (img, callback) {
    this.loadFromURL(img.src, callback);
};

ImageStorage.loadFromURL = function (url, callback) {
    var xhr = new XMLHttpRequest;
    xhr.open("GET", url, true);
    xhr.responseType = "arraybuffer";
    xhr.onload = function () {
        var data, png;
        data = new Uint8Array(xhr.response || xhr.mozResponseArrayBuffer);
        callback(new ImageStorage(data));
    };
    return xhr.send(null);
};

ImageStorage.prototype.keyExistsInData = function (key) {
    var data = null;
    this.forEachTextChunk(function (k, v, begin, length) {
        if (k == key) {
            data = {begin: begin, length: length}
        }
    });
    return data;
};

ImageStorage.prototype.forEachTextChunk = function (callback) {
    var pos = ImageStorage.CHUNK_START;
    while (true) {
        var chunkSize = this.data[pos] << 24 | this.data[pos + 1] << 16 | this.data[pos + 2] << 8 | this.data[pos + 3];
        pos += 4;
        var section = "";
        for (var i = 0; i < 4; i++) {
            section += String.fromCharCode(this.data[pos]);
            pos++;
        }
        if (section == 'tEXt') {
            var chunkBegin = pos - 8;
            var text = [];
            for (var i = 0; i < chunkSize; i++) {
                text.push(this.data[pos]);
                pos++;
            }
            var index = text.indexOf(0);
            var key = String.fromCharCode.apply(String, text.slice(0, index));
            callback(key, String.fromCharCode.apply(String, text.slice(index + 1)), chunkBegin, 4 + 4 + chunkSize + 4);
            break;
        }
        else if (section == 'IEND') {
            this.lastChunk = pos - 8;
            return;
        }
        else {
            pos += chunkSize;
        }
        pos += 4;
        if (pos > this.data.length) {
            throw new Error("Incomplete or corrupt PNG file");
        }
    }
};

ImageStorage.prototype.updateKVP = function (k, v) {
    var existing = this.keyExistsInData(k);
    var chunk = this.getTextChunkBytes(k, v);
    if (existing != null) {
        this.data = this.replaceBytes(existing.begin, existing.length, this.data, chunk);
    }
    else {
        this.data = this.replaceBytes(this.lastChunk, 0, this.data, chunk);
    }
};

ImageStorage.prototype.getTextChunkBytes = function (k, v) {
    var bytes = new Uint8Array(4 + 4 + k.length + 1 + v.length + 4);
    var chunkSize = k.length + 1 + v.length;
    bytes[0] = (chunkSize >> 24)& (255);
    bytes[1] = (chunkSize >> 16)& (255);
    bytes[2] = (chunkSize >> 8)& (255);
    bytes[3] = chunkSize & (255);
    bytes[4] = "t".charCodeAt(0);
    bytes[5] = "E".charCodeAt(0);
    bytes[6] = "X".charCodeAt(0);
    bytes[7] = "t".charCodeAt(0);
    for (var i = 0; i < k.length; i++) {
        bytes[8 + i] = k.charCodeAt(i);
    }
    bytes[8 + k.length] = 0;
    for (i = 0; i < v.length; i++) {
        bytes[8 + k.length + 1 + i] = v.charCodeAt(i);
    }

    return bytes;
};

ImageStorage.prototype.replaceBytes = function (start, len, data, bytes) {
    var d = new Uint8Array(data.length - len + bytes.length);
    for (var i = 0; i < start; i++) {
        d[i] = data[i];
    }
    for (i = 0; i < bytes.length; i++) {
        d[start + i] = bytes[i];
    }
    for (i = 0; i < (data.length - (start + len)); i++) {
        d[start + bytes.length + i] = data[start + len + i];
    }
    return d;
};

ImageStorage.prototype.save = function (callback) {
    for (var i in this.kvp) {
        if (this.kvp.hasOwnProperty(i)) {
            this.updateKVP(i, this.kvp[i]);
        }
    }
    function uint8ToString(buf) {
        var len = buf.byteLength;
        var binary = "";
        for (var i = 0; i < len; i++) {
            binary += String.fromCharCode(buf[ i ])
        }
        return btoa(binary);
    }

    //var n = new ImageStorage(this.data);
    var img = new Image();
    img.onload = function () {
        callback(img);
    };
    img.src = "data:image/png;base64," + uint8ToString(this.data);
};

ImageStorage.prototype.set = function (k, v) {
    if (k.length == 0) {
        throw "Cannot have empty key";
    }
    if (k.length > 79) {
        throw "Key is too long";
    }
    if (k.length + 1 + v.length >= 0xFFFFFFFF) {
        throw "Key value pair is too long (key+ null seperator + value";
    }
    this.kvp[k] = v;
};

ImageStorage.prototype.get = function (k) {
    return this.kvp[k];
};

ImageStorage.prototype.remove = function (key) {
    var data = null;
    this.forEachTextChunk(function (k, v, begin, length) {
        if (k == key) {
            data = {begin: begin, length: length}
        }
    });
    if(data!=null){
        this.data = this.replaceBytes(data.begin,data.length,this.data,[]);
        delete this.kvp[key];
    }
};