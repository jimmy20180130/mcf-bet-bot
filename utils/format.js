module.exports.addCommas = function(number) {
    if(isNaN(number)) return number;
    number = new String(number);
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

module.exports.removeCommas = function(numberStr) {
    if(typeof numberStr !== 'string') return numberStr;
    return numberStr.replace(/,/g, '');
}