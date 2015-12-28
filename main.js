import IMPLEMENTATIONS from './hash-implementations';

const LIBRARIES = [
    'three.min.js',
    'jquery-2.1.4.min.js',
    'angular.min.js',
    'react-0.13.3.min.js',
    'd3.min.js',
    'raphael-min.js',
    'moment-with-locales.min.js',
];

const PRECOMPUTED_RESULTS = {
    // computed with `sha256sum` cli of GNU coreutils
    'sha256': {
        'three.min.js': '1f7805e0870ff94285773806bccc88fa4c992a159b02aa5288e070f1356d3836',
        'jquery-2.1.4.min.js': 'f16ab224bb962910558715c82f58c10c3ed20f153ddfaa199029f141b5b0255c',
        'angular.min.js': '79ff1591234ea9434d7f96516781130625b1880ba4fa8eb965b278337e11f8ae',
        'react-0.13.3.min.js': 'a9cabcd164e8e495c28685591c7d2e4d9cab95a8daff1c52abf9be221fffd74f',
        'd3.min.js': 'c641285840b6477b0e5da33c8e768a4f8de0ba80b24db92218016b6ad8fdc754',
        'raphael-min.js': 'df8ebbd8b4047589534140d324b9b55a3c6bf1651e847ed1a9ef9c8a82b472ea',
        'moment-with-locales.min.js': 'f828fba78735e7a4148eecda050132f08449b67c65e0583f7466a9b75deba686',
    },
    'crc32': {
        // computed with `crc32` cli of Archive::Zip module for Perl, `apt-get install libarchive-zip-perl`
        'angular.min.js':             2585735538, // hex; '9a1f3172'
        'd3.min.js':                  837534011,  // hex; '31ebc13b'
        'jquery-2.1.4.min.js':        3426226962, // hex; 'cc381312'
        'moment-with-locales.min.js': 1383239629, // hex; '52728fcd'
        'raphael-min.js':             3380853797, // hex; 'c983bc25'
        'react-0.13.3.min.js':        855557035,  // hex; '32fec3ab'
        'three.min.js':               3718524366, // hex; 'dda42dce'
    },
    'md5': {
        // computed with `md5sum` cli of GNU coreutils
        'angular.min.js':             'b1137641dbb512a60e83d673f7e2d98f',
        'd3.min.js':                  '5936da7688d010c60aaf8374f90fcc2b',
        'jquery-2.1.4.min.js':        'f9c7afd05729f10f55b689f36bb20172',
        'moment-with-locales.min.js': '372de03356dcf915b0d47862dfae2300',
        'raphael-min.js':             'a04c1675e8c8e38fabc52a671c5a1f86',
        'react-0.13.3.min.js':        'c3b6b1bdf51c9ef4ba3473a2e1dcb83a',
        'three.min.js':               'dc74fdfec0aab5ad75af6b99e2c37cb0',
    },
};

function req(url, callback) {

    var req = new XMLHttpRequest();

    req.onreadystatechange = function(){
        if ( req.readyState === 4 ) {
            callback(req.responseText);
        }
    };

    req.open('GET',url);

    req.send();

}


(function(){

    var results = {}; for(var lib of LIBRARIES) { results[lib] = []; };
    var libraries = {};
    var n_resp_count = 0;

    LIBRARIES.forEach(function(lib){
        req('libs/'+lib, function(source_code){

            libraries[lib] = {
                source_code: source_code,
                has_wide_char: (function(str){
                    for( var i = 0; i < str.length; i++ ){
                        if ( str.charCodeAt(i) >>> 8 ) return true;
                    }
                    return false;
                })(source_code)
            };

            IMPLEMENTATIONS.forEach(function(algo){

                var execTime;
                var hash;

                var past = new Date();

                // This code does not work as I expected.
                // The problem is that the promise.then callback
                // is NOT executed while this iteration is running.
                // It appeared to be run and the next outer forEach loop
                // when a new request is done.
                // As a consequence the time captured will be only captured when
                // all implementations in this forEach loop have executed.
                //
                // There is an excellent article https://jakearchibald.com/2015/tasks-microtasks-queues-and-schedules/
                // about which timing can be expected.
                //
                // However it appears that the triggering I observed with
                // Chrome Version 47.0.2526.106 (64-bit) on OS X 10.10.5
                // may not be explained there.

                var promise;

                try{
                    hash = algo.compute(source_code);
                    if (!(!!hash.then && typeof obj.then === 'function')) {
                      promise = Promise.resolve(hash)
                    } else {
                      promise = hash
                    }
                }
                catch(e){
                  promise = Promise.reject(e);
                }

                promise.then(function (result) {
                  hash = result
                  execTime = new Date() - past;
                }).catch(function (e) {
                  hash = e.toString();
                  execTime = '-';
                }).then( function() {
                  results[lib].push(Object.assign(
                      {},
                      algo,
                      {
                          hash: hash,
                          execTime: execTime,
                          hash_is_correct: (function(){
                              if( ! PRECOMPUTED_RESULTS[algo.hash_function] ) return null;
                              return hash === PRECOMPUTED_RESULTS[algo.hash_function][lib];
                          })(),
                      }
                  ));
                })
            });

            if( ++n_resp_count === LIBRARIES.length ) {
                sort_results(results);
                print_results(results, libraries);
            }
        });
    });

})();

function sort_results(results){
    for(var lib in results) {
        results[lib] = (
            results[lib].sort(function(l, r){
                if( l.hash_function > r.hash_function ) return -1;
                if( l.hash_function < r.hash_function ) return 1;
                if( l.execTime > r.execTime ) return 1;
                if( l.execTime < r.execTime ) return -1;
                return 0;
            })
        );
    }
}

var out = document.getElementById("results");
out.innerHTML = 'computing...';

function print_results(results, libraries){

        out.innerHTML = "";

        for(var lib in results) {

            var title = document.createElement("h3");
            title.innerHTML = "Time to compute hash of "+lib+" [~ "+Math.round(libraries[lib].source_code.length/1000)+" KB]";
            if(libraries[lib].has_wide_char) title.innerHTML += " [contains wide character]";

            var table = document.createElement("table");
            table.style.borderSpacing = '20px 0px';
            table.style.fontFamily = 'monospace';
            var header = document.createElement("tr");
            header.innerHTML = "<td>time (ms)</td><td>Hash Function</td><td>Implementation</td><td>hash</td>";
            table.appendChild(header);

            out.appendChild(title);
            out.appendChild(table);

            for(var algo of results[lib]) {

                var result_row = document.createElement("tr");
                var color = algo.hash_is_correct && 'black' || algo.hash_is_correct===false && 'red' || 'grey';
                result_row.innerHTML = `
                    <td>${algo.execTime}</td>
                    <td>${algo.hash_function}</td>
                    <td><a target='_blank' href='${algo.source}'>${algo.name}</a></td>
                    <td style='color: ${color}'>${algo.hash}</td>`;
                table.appendChild(result_row);

            }

        }

}
