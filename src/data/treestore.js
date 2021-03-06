/**
 * @fileOverview 树形对象缓冲类
 * @ignore
 */

define('bui/data/treestore',['bui/common','bui/data/node','bui/data/abstractstore','bui/data/proxy'],function (require) {

  var BUI = require('bui/common'),
    Node = require('bui/data/node'),
    Proxy = require('bui/data/proxy'),
    AbstractStore = require('bui/data/abstractstore');

  /**
   * @class BUI.Data.TreeStore
   * 树形数据缓冲类
   * <p>
   * <img src="../assets/img/class-data.jpg"/>
   * </p>
   * <pre><code>
   *   //加载静态数据
   *   var store = new TreeStore({
   *     root : {
   *       text : '根节点',
   *       id : 'root'
   *     },
   *     data : [{id : '1',text : 1},{id : '2',text : 2}] //会加载成root的children
   *   });
   *   //异步加载数据，自动加载数据时，会调用store.load({id : 'root'}); //root为根节点的id
   *   var store = new TreeStore({
   *     root : {
   *       text : '根节点',
   *       id : 'root'
   *     },
   *     url : 'data/nodes.php',
   *     autoLoad : true  //设置自动加载，初始化后自动加载数据
   *   });
   *
   *   //加载指定节点
   *   var node = store.findNode('1');
   *   store.loadNode(node);
   *   //或者
   *   store.load({id : '1'});//可以配置自定义参数，返回值附加到指定id的节点上
   * </code></pre>
   * @extends BUI.Data.AbstractStore
   */
  function TreeStore(config){
    TreeStore.superclass.constructor.call(this,config);
  }

  TreeStore.ATTRS = {
    /**
     * 根节点
     * <pre><code>
     *  var store = new TreeStore({
     *    root : {text : '根节点',id : 'rootId',children : [{id : '1',text : '1'}]}
     *  });
     * </code></pre>
     * @cfg {Object} root
     */
    /**
     * 根节点,初始化后不要更改对象，可以更改属性值
     * <pre><code>
     *  var root = store.get('root');
     *  root.text = '修改的文本'；
     *  store.update(root);
     * </code></pre>
     * @type {Object}
     * @readOnly
     */
    root : {

    },
    /**
     * 数据映射，用于设置的数据跟@see {BUI.Data.Node} 不一致时，进行匹配。
     * 如果此属性为null,那么假设设置的对象是Node对象
     * <pre><code>
     *   //例如原始数据为 {name : '123',value : '文本123',isLeaf: false,nodes : []}
     *   var store = new TreeStore({
     *     map : {
     *       id : 'name',
     *       text : 'value',
     *       leaf : 'isLeaf',
     *       children : 'nodes'
     *     }
     *   });
     *   //映射后，记录会变成  {id : '123',text : '文本123',leaf: false,children : []};
     *   //此时原始记录会作为对象的 record属性
     *   var node = store.findNode('123'),
     *     record = node.record;
     * </code></pre> 
     * **Notes:**
     * 使用数据映射的记录仅做于展示数据，不作为可更改的数据，add,update不会更改数据的原始数据
     * @cfg {Object} map
     */
    map : {

    },
    /**
     * 返回数据标示数据的字段</br>
     * 异步加载数据时，返回数据可以使数组或者对象
     * - 如果返回的是对象,可以附加其他信息,那么取对象对应的字段 {nodes : [],hasError:false}
     * - 如何获取附加信息参看 @see {BUI.Data.AbstractStore-event-beforeProcessLoad}
     * <pre><code>
     *  //返回数据为数组 [{},{}]，会直接附加到加载的节点后面
     *  
     *  var node = store.loadNode('123');
     *  store.loadNode(node);
     *  
     * </code></pre>
     * @cfg {Object} [dataProperty = 'nodes']
     */
    dataProperty : {
      value : 'nodes'
    },
    events : {
      value : [
        /**  
        * 当添加数据时触发该事件
        * @event  
        * <pre><code>
        *  store.on('add',function(ev){
        *    list.addItem(e.node,index);
        *  });
        * </code></pre>
        * @param {jQuery.Event} e  事件对象
        * @param {Object} e.node 添加的节点
        * @param {Number} index 添加的位置
        */
        'add',
        /**  
        * 当更新数据指定字段时触发该事件 
        * @event  
        * @param {jQuery.Event} e  事件对象
        * @param {Object} e.node 更新的节点
        */
        'update',
        /**  
        * 当删除数据时触发该事件
        * @event  
        * @param {jQuery.Event} e  事件对象
        * @param {Object} e.node 删除的节点
        * @param {Number} index 删除节点的索引
        */
        'remove',
        /**  
        * 节点加载完毕触发该事件
        * <pre></code>
        *   //异步加载节点,此时节点已经附加到加载节点的后面
        *   store.on('load',function(ev){
        *     var params = ev.params,
        *       id = params.id,
        *       node = store.findNode(id),
        *       children = node.children;  //节点的id
        *     //TO DO
        *   });
        * </code></pre>
        * 
        * @event  
        * @param {jQuery.Event} e  事件对象
        * @param {Object} e.node 加载的节点
        * @param {Object} e.params 加载节点时的参数
        */
        'load'
      ]
    }
  }

  BUI.extend(TreeStore,AbstractStore);

  BUI.augment(TreeStore,{
    /**
     * @protected
     * @override
     * 初始化前
     */
    beforeInit:function(){
      this.initRoot();
    },
    //初始化数据,如果默认加载数据，则加载数据
    _initData : function(){
      var _self = this,
        autoLoad = _self.get('autoLoad'),
        root = _self.get('root');

      if(autoLoad && !root.children){
        params = root.id ? {id : root.id}: {};
        _self.load(params);
      }
    },
    /**
     * @protected
     * 初始化根节点
     */
    initRoot : function(){
      var _self = this,
        map = _self.get('map'),
        root = _self.get('root');
      if(!root){
        root = {};
      }
      if(!root.isNode){
        root = new Node(root,map);
      }
      root.path = [root.id];
      root.level = 0;
      if(root.children){
        _self.setChildren(root,root.children);
      }
      _self.set('root',root);
    },
    /**
     * 添加节点，触发{@link BUI.Data.TreeStore#event-add} 事件
     * <pre><code>
     *  //添加到根节点下
     *  store.add({id : '1',text : '1'});
     *  //添加到指定节点
     *  var node = store.findNode('1'),
     *    subNode = store.add({id : '11',text : '11'},node);
     *  //插入到节点的指定位置
     *  var node = store.findNode('1'),
     *    subNode = store.add({id : '12',text : '12'},node,0);
     * </code></pre>
     * @param {BUI.Data.Node|Object} node 节点或者数据对象
     * @param {BUI.Data.Node} [parent] 父节点,如果未指定则为根节点
     * @param {Number} [index] 添加节点的位置
     * @return {BUI.Data.Node} 添加完成的节点
     */
    add : function(node,parent,index){
      var _self = this;

      node = _self._add(node,parent,index);
      _self.fire('add',{node : node,index : index});
      return node;
    },
    //
    _add : function(node,parent,index){
      parent = parent || this.get('root');  //如果未指定父元素，添加到跟节点
      var _self = this,
        map = _self.get('map'),
        nodes = parent.children,
        nodeChildren = node.children || [];
      if(nodeChildren.length == 0 && node.leaf == null){
        node.leaf = true;
      }
      if(!node.isNode){
        node = new Node(node,map);
      }
      node.parent = parent;
      node.level = parent.level + 1;
      node.path = parent.path.concat(node.id);
      parent.leaf = false;
      index = index == null ? parent.children.length : index;
      BUI.Array.addAt(nodes,node,index);

      _self.setChildren(node,nodeChildren);
      return node;
    },
    /**
     * 移除节点，触发{@link BUI.Data.TreeStore#event-remove} 事件
     * 
     * <pre><code>
     *  var node = store.findNode('1'); //根据节点id 获取节点
     *  store.remove(node);
     * </code></pre>
     * 
     * @param {BUI.Data.Node} node 节点或者数据对象
     * @return {BUI.Data.Node} 删除的节点
     */
    remove : function(node){
      var parent = node.parent || _self.get('root'),
        index = BUI.Array.indexOf(node,parent.children) ;

      BUI.Array.remove(parent.children,node);
      if(parent.children.length === 0){
        parent.leaf = true;
      }
      this.fire('remove',{node : node , index : index});
      node.parent = null;
      return node;
    },
    /**
     * 更新节点
     * <pre><code>
     *  var node = store.findNode('1'); //根据节点id 获取节点
     *  node.text = 'modify text'; //修改文本
     *  store.update(node);        //此时会触发update事件，绑定了store的控件会更新对应的DOM
     * </code></pre>
     * @return {BUI.Data.Node} 更新节点
     */
    update : function(node){
      this.fire('update',{node : node});
    },
    /**
     * 返回缓存的数据，根节点的直接子节点集合
     * <pre><code>
     *   //获取根节点的所有子节点
     *   var data = store.getResult();
     *   //获取根节点
     *   var root = store.get('root');
     * </code></pre>
     * @return {Array} 根节点下面的数据
     */
    getResult : function(){
      return this.get('root').children;
    },
    /**
     * 设置缓存的数据，设置为根节点的数据
    *   <pre><code>
    *     var data = [
    *       {id : '1',text : '文本1'},
    *       {id : '2',text : '文本2',children:[
    *         {id : '21',text : '文本21'}
    *       ]},
    *       {id : '3',text : '文本3'}
    *     ];
    *     store.setResult(data); //会对数据进行格式化，添加leaf等字段：
    *                            //[{id : '1',text : '文本1',leaf : true},{id : '2',text : '文本2',leaf : false,children:[...]}....]
    *   </code></pre>
     * @param {Array} data 缓存的数据
     */
    setResult : function(data){
      var _self = this,
        proxy = _self.get('proxy'),
        root = _self.get('root');
      if(proxy instanceof Proxy.Memery){
        _self.set('data',data);
        _self.load({id : root.id});
      }else{
        _self.setChildren(root,data);
      }
    },
    /**
     * 设置子节点
     * @protected
     * @param {BUI.Data.Node} node  节点
     * @param {Array} children 子节点
     */
    setChildren : function(node,children){
      var _self = this;
      node.children = [];
      if(!children.length){
        return;
      }
      BUI.each(children,function(item){
        _self._add(item,node);
      });
    },
    /**
     * 查找节点
     * <pre><code>
     *  var node = store.findNode('1');//从根节点开始查找节点
     *  
     *  var subNode = store.findNode('123',node); //从指定节点开始查找
     * </code></pre>
     * @param  {String} id 节点Id
     * @param  {BUI.Data.Node} [parent] 父节点
     * @return {BUI.Data.Node} 节点
     */
    findNode : function(id,parent){
      var _self = this;

      if(!parent){
        var root = _self.get('root');
        if(root.id === id){
          return root;
        }
        return _self.findNode(id,root);
      }
      var children = parent.children,
        rst = null;
      BUI.each(children,function(item){
        if(item.id === id){
          rst = item;
        }else{
          rst = _self.findNode(id,item);
        }
        if(rst){
          return false;
        }
      });
      return rst;
    },
    /**
     * 查找节点,根据匹配函数查找
     * <pre><code>
     *  var nodes = store.findNodesBy(function(node){
     *   if(node.status == '0'){
     *     return true;
     *   }
     *   return false;
     *  });
     * </code></pre>
     * @param  {Function} func 匹配函数
     * @param  {BUI.Data.Node} [parent] 父元素，如果不存在，则从根节点查找
     * @return {Array} 节点数组
     */
    findNodesBy : function(func,parent){
      var _self = this,
        root,
        rst = [];

      if(!parent){
        parent = _self.get('root');
      }

      BUI.each(parent.children,function(item){
        if(func(item)){
          rst.push(item);
        }
        rst = rst.concat(_self.findNodesBy(func,item));
      });

      return rst;
    },
    /**
     * 是否包含指定节点，如果未指定父节点，从根节点开始搜索
     * <pre><code>
     *  store.contains(node); //是否存在节点
     *
     *  store.contains(subNode,node); //节点是否存在指定子节点
     * </code></pre>
     * @param  {BUI.Data.Node} node 节点
     * @param  {BUI.Data.Node} parent 父节点
     * @return {Boolean} 是否包含指定节点
     */
    contains : function(node,parent){
      var _self = this,
        findNode = _self.findNode(node.id,parent);
      return !!findNode;
    },
    /**
     * 加载完数据
     * @protected
     * @override
     */
    afterProcessLoad : function(data,params){
      var _self = this,
        id = params.id,
        dataProperty = _self.get('dataProperty'),
        node = _self.findNode(id) || _self.get('root');//如果找不到父元素，则放置在跟节点
      if(BUI.isArray(data)){
        _self.setChildren(node,data);
      }else{
        _self.setChildren(node,data[dataProperty]);
      }
      _self.fire('load',{node : node,params : params});
    },
    /**
     * 是否包含数据
     * @return {Boolean} 
     */
    hasData : function(){
      return true;
      //return this.get('root').children && this.get('root').children.length !== 0;
    },
    /**
     * 是否已经加载过，叶子节点或者存在字节点的节点
     * @param   {BUI.Data.Node} node 节点
     * @return {Boolean}  是否加载过
     */
    isLoaded : function(node){
      if(!this.get('url')){ //如果不从远程加载数据,默认已经加载
        return true;
      }
      return node.leaf || node.children.length;
    },
    /**
     * 加载节点的子节点
     * @param  {BUI.Data.Node} node 节点
     */
    loadNode : function(node){
      var _self = this;
      //如果已经加载过，或者节点是叶子节点
      if(_self.isLoaded(node)){
        return ;
      }
      if(!_self.get('url')){ //如果不从远程加载数据，不是根节点的话，取消加载
        return;
      }else{
        _self.load({id:node.id});
      }
      
    }
  });

  return TreeStore;

});