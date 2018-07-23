var constants = require('./tdConst')

var uniquePosArray = function(arr){
    var hash = {};
    var base = 10000;
    var resultArr = [];
    for(var i=0; i<arr.length; i++){
        var obj = arr[i];
        // 去重
        if(hash[(base*obj.x+obj.y)]){
            continue;
        }
        resultArr.push(obj);
    }
    return resultArr;
}

var TDPaopao = function(position, power, role){
    this.isActive = true;
    this.position = position;
    this.power = power;
    this.role = role;
    this.map = this.role.getMap();
    this.map.setValue(position.x,position.y,constants.PAOPAO);
    this.game = this.role.game;
    
    console.log('paopao created at'+ this.position.x+","+this.position.y);

    var self = this;
    this.boomTimeout = setTimeout(function(){
        self.boom();
    },3000);

}

TDPaopao.prototype.clearBoomTimeout = function(){
    clearTimeout(this.boomTimeout);
}

TDPaopao.prototype.calcItemPosibility = function(){
    // return parseInt(Math.round());
    return 1;
}

TDPaopao.prototype.boom = function(){
    console.log('paopao boom  at'+this.position.x+","+this.position.y);
    // this.role.deletePaopao(this);

    var result = this.findPaopaoBombXY(this.position);
    var boomPaopaoArr = result.boomPaopaoArr;
    var boomXYArr = result.boomXYArr;
    var boomBoxArr = result.boomBoxArr;
    var itemArr = [];

    // 终止泡泡爆炸动画
    for(var i =0; i<boomPaopaoArr.length; i++){
        var pos = boomPaopaoArr[i];
        var paopao = this.game.paopaoArr[pos.x][pos.y];
        if(paopao)
            paopao.role.deletePaopao(paopao);
    }
    // 炸掉道具
    for(var i =0; i<boomXYArr.length; i++){
        var pos = boomXYArr[i];
        if(this.map.isPositionAnItem(pos.x,pos.y)){
            console.log("itemEaten"+ pos);
            this.game.broadcastMsg("itemEaten",{x:pos.x,y:pos.y,role:'null'});
        }
        this.map.setValue(pos.x,pos.y,constants.GROUND);
        //角色死亡判断
        var masterRole = this.game.roleArr[0];
        var challengerRole = this.game.roleArr[1];
        var masterMapPos = masterRole.getMapLocation(masterRole.position.x,masterRole.position.y);
        var challengerMapPos = challengerRole.getMapLocation(challengerRole.position.x,challengerRole.position.y);
        if(pos.x == masterMapPos.x && pos.y == masterMapPos.y) {
            challengerRole.score += constants.SCORE_FOR_MAN;
            masterRole.roleBoom();                
            this.game.broadcastMsg("roleBoom",{x:pos.x,y:pos.y,role:this.role.name});
        }
        if(pos.x == challengerMapPos.x && pos.y == challengerMapPos.y){
            masterRole.score += constants.SCORE_FOR_MAN;
            challengerRole.roleBoom();                
            this.game.broadcastMsg("roleBoom",{x:pos.x,y:pos.y,role:this.role.name});
        } 
    }
    // 生成道具
    for(var i =0; i<boomBoxArr.length; i++){
        var pos = boomBoxArr[i];
        if(this.map.getValue(pos.x,pos.y)==constants.GIFT_WALL && this.calcItemPosibility()){
            var itemCode = 101 + parseInt(Math.random()*3);
            this.map.setValue(pos.x,pos.y,itemCode);
            itemArr.push({x:pos.x,y:pos.y,itemCode:itemCode});
        }else{
            this.map.setValue(pos.x,pos.y,constants.GROUND);
        }
    }
    result['itemArr'] = itemArr;

    console.log(result);
    var game = this.game;
    game.broadcastMsg("boomInfo",result);

};

TDPaopao.prototype.findPaopaoBombXY = function(currentMapLocation){
    if(this.isActive){
        this.isActive = false;
        var boomXYArr = [];
        var boomBoxArr = [];
        var boomPaopaoArr = [];
        //是否可以前进
        var canGo = {Up : true, Down : true, Left : true, Right : true};
        boomXYArr.push({x:currentMapLocation.x, y:currentMapLocation.y});
        boomPaopaoArr.push({x:currentMapLocation.x, y:currentMapLocation.y});

        for(var i=1; i<= this.power; i++){
            //向左
            if(currentMapLocation.y-i >= 0 ){
                if(canGo.Left){
                    var calcX = currentMapLocation.x;
                    var caclY = currentMapLocation.y-i;
                    mapValue = this.map.getValue(calcX,caclY);
                    if(0 < mapValue && mapValue < 4){
                        canGo.Left = false;
                        // 处理箱子爆炸 先不随机刷礼物 最后再统一刷礼物
                        boomBoxArr.push({x:calcX, y:caclY});
                        //炸掉盒子的得分
                        this.role.score += constants.SCORE_FOR_WALL;
                    }else if(4<= mapValue && mapValue < 100){
                        canGo.Left = false;
                        //无法被炸毁的东西，直接过
                    }else if(mapValue == 100){
                        canGo.Left = false;
                        //如果旁边是泡泡，将该泡泡的爆炸区域合并到现在
                        var nextPaopao = this.game.paopaoArr[calcX][caclY];
                        var nextResult = nextPaopao.findPaopaoBombXY({x:calcX,y:caclY});
                        if(nextResult){
                            boomXYArr = uniquePosArray(boomXYArr.concat(nextResult.boomXYArr));
                            boomBoxArr = uniquePosArray(boomBoxArr.concat(nextResult.boomBoxArr));
                            boomPaopaoArr = uniquePosArray(boomPaopaoArr.concat(nextResult.boomPaopaoArr));
                        }
                    }else{
                        boomXYArr.push({x:calcX, y:caclY});
                    }
                }
            }
            //向右
            if(currentMapLocation.y+i < this.map.getXLen()){
                if(canGo.Right){
                    var calcX = currentMapLocation.x;
                    var caclY = currentMapLocation.y+i;
                    mapValue = this.map.getValue(calcX,caclY);
                    if(0 < mapValue && mapValue < 4){
                        canGo.Right = false;
                        // 处理箱子爆炸 先不随机刷礼物 最后再统一刷礼物
                        boomBoxArr.push({x:calcX, y:caclY});
                        //炸掉盒子的得分
                        this.role.score += constants.SCORE_FOR_WALL;
                    }else if(4<= mapValue && mapValue < 100){
                        canGo.Right = false;
                        //无法被炸毁的东西，直接过
                    }else if(mapValue == 100){
                        canGo.Right = false;
                        //如果旁边是泡泡，将该泡泡的爆炸区域合并到现在
                        var nextPaopao = this.game.paopaoArr[calcX][caclY];
                        var nextResult = nextPaopao.findPaopaoBombXY({x:calcX,y:caclY});
                        if(nextResult){
                            boomXYArr = uniquePosArray(boomXYArr.concat(nextResult.boomXYArr));
                            boomBoxArr = uniquePosArray(boomBoxArr.concat(nextResult.boomBoxArr));
                            boomPaopaoArr = uniquePosArray(boomPaopaoArr.concat(nextResult.boomPaopaoArr));
                        }
                    }else{
                        boomXYArr.push({x:calcX, y:caclY});
                    }
                }
            }
            //向上
            if(currentMapLocation.x-i >= 0){
                if(canGo.Up){
                    var calcX = currentMapLocation.x-i;
                    var caclY = currentMapLocation.y;
                    mapValue = this.map.getValue(calcX,caclY);
                    if(0 < mapValue && mapValue < 4){
                        canGo.Up = false;
                        // 处理箱子爆炸 先不随机刷礼物 最后再统一刷礼物
                        boomBoxArr.push({x:calcX, y:caclY});
                        //炸掉盒子的得分
                        this.role.score += constants.SCORE_FOR_WALL;
                    }else if(4<= mapValue && mapValue < 100){
                        canGo.Up = false;
                        //无法被炸毁的东西，直接过
                    }else if(mapValue == 100){
                        canGo.Up = false;
                        //如果旁边是泡泡，将该泡泡的爆炸区域合并到现在
                        var nextPaopao = this.game.paopaoArr[calcX][caclY];
                        var nextResult = nextPaopao.findPaopaoBombXY({x:calcX,y:caclY});
                        if(nextResult){
                            boomXYArr = uniquePosArray(boomXYArr.concat(nextResult.boomXYArr));
                            boomBoxArr = uniquePosArray(boomBoxArr.concat(nextResult.boomBoxArr));
                            boomPaopaoArr = uniquePosArray(boomPaopaoArr.concat(nextResult.boomPaopaoArr));
                        }
                    }else{
                        boomXYArr.push({x:calcX, y:caclY});
                    }
                }
            }
            //向下
            if(currentMapLocation.x+i < this.map.getYLen()){
                if(canGo.Down){
                    var calcX = currentMapLocation.x+i;
                    var caclY = currentMapLocation.y;
                    mapValue = this.map.getValue(calcX,caclY);
                    if(0 < mapValue && mapValue < 4){
                        canGo.Down = false;
                        // 处理箱子爆炸 先不随机刷礼物 最后再统一刷礼物
                        boomBoxArr.push({x:calcX, y:caclY});
                        //炸掉盒子的得分
                        this.role.score += constants.SCORE_FOR_WALL;
                    }else if(4<= mapValue && mapValue < 100){
                        canGo.Down = false;
                        //无法被炸毁的东西，直接过
                    }else if(mapValue == 100){
                        canGo.Down = false;
                        //如果旁边是泡泡，将该泡泡的爆炸区域合并到现在
                        var nextPaopao = this.game.paopaoArr[calcX][caclY];
                        var nextResult = nextPaopao.findPaopaoBombXY({x:calcX,y:caclY});
                        if(nextResult){
                            boomXYArr = uniquePosArray(boomXYArr.concat(nextResult.boomXYArr));
                            boomBoxArr = uniquePosArray(boomBoxArr.concat(nextResult.boomBoxArr));
                            boomPaopaoArr = uniquePosArray(boomPaopaoArr.concat(nextResult.boomPaopaoArr));
                        }
                    }else{
                        boomXYArr.push({x:calcX, y:caclY});
                    }
                }
            }
        }
        return {boomXYArr:boomXYArr,boomBoxArr:boomBoxArr,boomPaopaoArr:boomPaopaoArr}
    }else{
        return null;
    }
}

module.exports = TDPaopao