import IMPLEMENTATIONS from './hash-implementations';
import bows from 'bows'

const log = bows('main.js')

const PROFILED_IMPLEMENTATIONS = IMPLEMENTATIONS.filter(algo => true);
  //['webcrypto', 'sjcl', 'forge', 'forge [UTF8]'].indexOf(algo.name) >= 0
  // ['webcrypto', 'forge', 'jssha2'].indexOf(algo.name) >= 0);

const LIBRARIES = [
    'three.min.js',
    'jquery-2.1.4.min.js',
    'angular.min.js',
    'react-0.13.3.min.js',
    'd3.min.js',
    'raphael-min.js',
    'moment-with-locales.min.js',
];

const ALL_LIBRARIES = LIBRARIES.filter( lib =>
  //true);
  ['three.min.js', 'angular.min.js', 'moment-with-locales.min.js'].indexOf(lib) >= 0);


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

// from http://www.html5rocks.com/en/tutorials/es6/promises/
function get(url) {
  // Return a new promise.
  return new Promise(function(resolve, reject) {
    // Do the usual XHR stuff
    var req = new XMLHttpRequest();
    req.open('GET', url);

    req.onload = function() {
      // This is called even on 404 etc
      // so check the status
      if (req.status == 200) {
        // Resolve the promise with the response text
        resolve(req.response);
      }
      else {
        // Otherwise reject with the status text
        // which will hopefully be a meaningful error
        reject(Error(req.statusText));
      }
    };

    // Handle network errors
    req.onerror = function() {
      reject(Error("Network Error"));
    };

    // Make the request
    req.send();
  });
}

function sync_compute(source_code, algo) {
  let source_head = source_code.substr(0, 10);
  log.debug("enter sync_compute for sync algo", algo, source_head)
  try {
    let past = new Date();
    let hash = algo.compute(source_code);
    return {
      algo: algo,
      hash: hash,
      execTime: new Date() - past,
    };
  } finally {
    log.debug("exit sync_compute for sync algo", algo, source_head)
  }
}


function promise_compute(source_code, algo) {
  var promise;

  let source_head = source_code.substr(0, 10);

  if (!algo.promise_compute) {
    promise = new Promise(function (resolve, reject) {
      log.debug("Created promise for sync algo", algo, source_head)
      try {
          let result = sync_compute(source_code, algo)
          log.debug("Calling resolve for sync algo", algo, source_head)
          resolve(result)
      }
      catch(e){
        log.debug("Calling reject for sync algo with error", algo, source_head, e)
        reject(e)
      }
    })
    return promise.catch( function (err) {
      log.debug("Promise then for sync algo with err", algo, source_head, err)
      return {
        algo: algo,
        hash: err.toString(),
        execTime: '-',
      };
    })
  } else {
    log.debug("Creating promise for async algo", algo, source_head)
    promise = algo.promise_compute(source_code).then( function (result) {
      log.debug("Promise then for async algo", algo, source_head)
      result.algo = algo
      return result;
    })
    log.debug("Created promise for async algo", algo, source_head)
  }
  return promise;
}

function testlib(lib, source_code, results) {
  log.debug('enter testlib(' + lib)
  var compute_promises = PROFILED_IMPLEMENTATIONS.map(algo =>
    promise_compute(source_code, algo)
  );

  try {
    return Promise.all(compute_promises).then( computes => {
      log.debug('Entering Promise.all() for lib:' + lib)
      for (let compute of computes) {
        results.push(Object.assign(
            {},
            compute.algo,
            {
                hash: compute.hash,
                execTime: compute.execTime,
                hash_is_correct: (function(){
                    if( ! PRECOMPUTED_RESULTS[compute.algo.hash_function] ) return null;
                    return compute.hash === PRECOMPUTED_RESULTS[compute.algo.hash_function][lib];
                })(),
            }
        ));
      }
    })
  } finally {
    log.debug('exit testlib(' + lib)
  }
}

function queueTestlibRequests(lib) {
  log.debug('enter queueTestlibRequests(' + lib)
  let source_code = libraries[lib].source_code
  var requests = PROFILED_IMPLEMENTATIONS.map(algo =>
    function() {
        return promise_compute(source_code, algo).then( result => {
          let end_result = Object.assign(
            {},
            algo,
            result,
            {
              lib: lib,
              hash_is_correct: (function(){
                  if( ! PRECOMPUTED_RESULTS[algo.hash_function] ) return null;
                  return result.hash === PRECOMPUTED_RESULTS[algo.hash_function][lib];
              })()
            })
          results[lib].push(end_result)
          return end_result
        })
    }
  );

  for (let cr of requests) {
    computation_requests.push(cr);
  }
  log.debug('exit queueTestlibRequests(' + lib)
}


function performRequests() {
  log.debug('enter performRequests: remaining requests=' + computation_requests.length)
  try {
    let computation = computation_requests.pop() // might be faster.
    if (computation) {
      computation().then(result => {
        print_result(result)
        log.debug('Showing result', result)
      }).then( function() {
        setTimeout(performRequests, 0)
      })
    } else {
      sort_results(results)
      print_results(results, libraries)
    }
  } finally {
    log.debug('exit performRequests')
  }
}

var out = document.getElementById("results");
out.innerHTML = 'computing...';
prepare_results_table();

// computation requests are functions which should be invoked to
// initiate computation of a particular algorithm
var computation_requests = [];
var libraries = {};
var results = {}; for(var lib of ALL_LIBRARIES) { results[lib] = []; };

setTimeout(main, 100) // allow for showing empty result tableaus

function main() {
    log.debug('enter main')

    var n_resp_count = 0;

    let get_computations = ALL_LIBRARIES.map( lib => get('libs/'+lib));

    let queue_computations = ALL_LIBRARIES.map( lib => {
      return get('libs/'+lib).then( source_code => {
        log.debug('lib downloaded:' + lib)
        libraries[lib] = {
            source_code: source_code,
            has_wide_char: (function(str){
                for( var i = 0; i < str.length; i++ ){
                    if ( str.charCodeAt(i) >>> 8 ) return true;
                }
                return false;
            })(source_code)
        };
        print_result_lib_header(null, lib, libraries)
      }).then( function() {
        log.debug('queuing test requests for lib:' + lib)
        queueTestlibRequests(lib)
      })
    })

    Promise.all(queue_computations).then( function() {
      performRequests()
    })
    log.debug('exit main')
}

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

function ids_table(lib) {
  return {
    title: 'id_title_' + lib,
    table: 'id_table_' + lib
  }
}

function ids_table_entry(lib, algo) {
  return {
    time: 'id_algo_time_' + lib + '_' + algo.name,
    hash: 'id_algo_hash_' + lib + '_' + algo.name,
  }
}

function createLibTitle(id, lib) {
  let title = document.createElement("h3");
  let table_ids = ids_table(lib)
  title.id = table_ids.title
  title.innerHTML = `Time to compute hash of ${lib} [not fetched yet]`;
  return title
}

function createTableWithHeader(id) {
  let table = document.createElement("table");
  table.id = id
  table.style.borderSpacing = '20px 0px';
  table.style.fontFamily = 'monospace';

  let header = document.createElement("tr");
  header.innerHTML = "<td>time (ms)</td><td>Hash Function</td><td>Implementation</td><td>hash</td>";
  table.appendChild(header);
  return table
}

function prepare_results_table() {
  out.innerHTML = '';
  let libs = ALL_LIBRARIES
  for (let lib of libs) {
    let table_ids = ids_table(lib)
    let title = createLibTitle(table_ids.title, lib)
    let table = createTableWithHeader(table_ids.table)
    out.appendChild(title)
    out.appendChild(table)

    for (let algo of PROFILED_IMPLEMENTATIONS) {
      var result_row = document.createElement("tr");
      let ids = ids_table_entry(lib, algo);
      result_row.innerHTML = `
          <td id='${ids.time}'>pending</td>
          <td>${algo.hash_function}</td>
          <td><a target='_blank' href='${algo.source}'>${algo.name}</a></td>
          <td id='${ids.hash}'>pending...</td>`;
      table.appendChild(result_row);
    }
  }
}

function print_result_lib_header(arg_title, lib, libraries) {
  let title = arg_title || document.getElementById(ids_table(lib).title);
  title.innerHTML = "Time to compute hash of "+lib+" [~ "+Math.round(libraries[lib].source_code.length/1000)+" KB]";
  if(libraries[lib].has_wide_char) title.innerHTML += " [contains wide character]";
}

function print_result(result) {
  let {lib, algo, execTime, hash} = result;
  let ids = ids_table_entry(lib, algo)
  let etime = document.getElementById(ids.time)
  let ehash = document.getElementById(ids.hash)
  let color = result.hash_is_correct && 'black' || result.hash_is_correct===false && 'red' || 'grey';
  etime.innerHTML = execTime
  ehash.style.color = color
  ehash.innerHTML = hash
}

function print_results() {
  out.innerHTML = ''
  let libs = ALL_LIBRARIES
  for (let lib of libs) {
    let table_ids = ids_table(lib)
    let title = createLibTitle(table_ids.title, lib)
    print_result_lib_header(title, lib, libraries)
    let table = createTableWithHeader(table_ids.table)
    out.appendChild(title)
    out.appendChild(table)
    for(let result of results[lib]) {
      let result_row = document.createElement("tr");
      let color = result.hash_is_correct && 'black' || result.hash_is_correct===false && 'red' || 'grey';
      result_row.innerHTML = `
        <td>${result.execTime}</td>
        <td>${result.hash_function}</td>
        <td><a target='_blank' href='${result.source}'>${result.name}</a></td>
        <td style='color: ${color}'>${result.hash}</td>`;

      table.appendChild(result_row);
    }
  }
}
