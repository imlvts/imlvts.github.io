import {
    debounce,
    switchPromise,
    distinctUntilChanged,
    map,
    pipe,
} from './nanorx.js';

const fetchAutocomplete = async (query) => {
    const re = new RegExp(query.toLowerCase(), 'i');
    const response = await fetch('names.txt?q=' + encodeURIComponent(query));
    const data = (await response.text()).split('\n');
    let filtered = data
        // we're doing filtering client-side, just pretend it's on the server
        .filter((suggestion) => re.test(suggestion))
        .slice(0, 10);
    return {names: filtered, query};
};

const render = (obj) => {
  if (typeof obj === 'string') {
    return new Text(obj);
  } else if (Array.isArray(obj)) {
    if (obj[0] === '!comment') {
      return new Comment(obj[1]);
    }
    const dom = document.createElement(obj[0]);
    const attrs = obj[1];
    Object.keys(attrs).forEach((key) => dom.setAttribute(key, attrs[key]));
    obj.slice(2).forEach((child) => child != null && child !== false && dom.appendChild(render(child)));
    return dom;
  } else {
    throw 'Cannot make dom of: ' + obj;
  }
};

const updateDOM = (target, component) => {
    while (target.firstChild) {
        target.removeChild(target.firstChild);
    }
    target.appendChild(render(component));
};

const hop = Object.prototype.hasOwnProperty;
const updateSuggestions = (suggestions) => {
    let component;
    if (hop.call(suggestions, 'result')) {
        const {result: {names, query}} = suggestions;
        if (!query) {
            component = 'Empty query';
        } else if (names.length) {
            component =
                ['ul', {},
                    ...names.map((word) =>
                        ['li', {class: 'suggestion'}, word])];
        } else {
            component =
                ['div', {class: 'empty'},
                    'No names found for ',
                    ['em', {}, query]];
        }
    } else {
        component = ['pre', {class: 'error'}, suggestions.error];
    }
    const target = document.getElementById('suggestions');
    updateDOM(target, component);
};

const handleInput = pipe(
    debounce(200, true),
    distinctUntilChanged(),
    switchPromise(fetchAutocomplete),
    updateSuggestions);

window.addEventListener('load', () => {
    document.getElementById('input')
        .addEventListener('input', (event) => handleInput(event.target.value));
    handleInput('');
});