function obj2objArr(data, opt){
    const tmpArr = [];
    
    for(let key in data){
        const value = data[key];
        
        if(opt && opt.key && opt.key.includes(key)) continue;
        if(opt && opt.value && opt.value.includes(value)) continue;
        
        tmpArr.push({[key]: value});
    }

    return tmpArr;
}


module.exports = {
    obj2objArr,
};