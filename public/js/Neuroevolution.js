/**
 * Provides a set of classes and methods for handling Neuroevolution and
 * genetic algorithms.
 * 提供神经进化与遗传算法相关的类与方法。
 *
 * Reusability 复用说明：
 * 本文件与具体游戏无关，可用于任意“状态→动作、结束时有一个分数”的场景（其他游戏、控制任务等）。
 * 使用方式：1) 用 options.network 指定 [输入数, 隐藏层数组, 输出数]；2) 每步将当前状态转为
 * 数字数组 inputs，调用 network.compute(inputs) 得到输出，再根据输出决定动作；3) 一局/一条命
 * 结束时调用 networkScore(network, score)。详见 README 或 PRINCIPLE.md。
 *
 * @param {options} An object of options for Neuroevolution. 神经进化配置对象。
 */
var Neuroevolution = function (options) {
	var self = this; // reference to the top scope of this module 本模块顶层引用

	// Declaration of module parameters (options) and default values
	// 模块参数（options）及默认值声明
	self.options = {
		/**
		 * Logistic activation function. 逻辑（Sigmoid）激活函数。
		 *
		 * @param {a} Input value. 输入值。
		 * @return Logistic function output. 激活函数输出。
		 */
		activation: function (a) {
			return 1 / (1 + Math.exp(-a));
		},

		/**
		 * Returns a random value between -1 and 1.
		 * 返回 [-1, 1] 之间的随机值。
		 *
		 * @return Random value. 随机值。
		 */
		randomClamped: function () {
			return Math.random() * 2 - 1;
		},

		// various factors and parameters (along with default values).
		// 各项因子与参数（及默认值）。
		network: [1, [1], 1], // Perceptron network structure (1 hidden layer). 感知机网络结构（一层隐藏层）。
		population: 50, // Population by generation. 每代种群数量。
		elitism: 0.2, // Best networks kept unchanged for the next generation (rate). 精英保留比例（直接进入下一代）。
		randomBehaviour: 0.2, // New random networks for the next generation (rate). 下一代中全新随机网络的比例。
		mutationRate: 0.1, // Mutation rate on the weights of synapses. 突触权重的变异概率。
		mutationRange: 0.5, // Interval of the mutation changes on the synapse weight. 权重变异的扰动范围。
		historic: 0, // Latest generations saved. 保留的最近代数量。
		lowHistoric: false, // Only save score (not the network). 是否仅保存分数（不保存网络）。
		scoreSort: -1, // Sort order (-1 = desc, 1 = asc). 得分排序方向（-1 降序，1 升序）。
		nbChild: 1 // Number of children by breeding. 每次繁殖产生的子代数量。

	}

	/**
	 * Override default options. 覆盖默认配置。
	 *
	 * @param {options} An object of Neuroevolution options. 神经进化配置对象。
	 * @return void
	 */
	self.set = function (options) {
		for (var i in options) {
			if (this.options[i] != undefined) { // Only override if the passed in value is actually defined. 仅当传入值有定义时才覆盖。
				self.options[i] = options[i];
			}
		}
	}

	// Overriding default options with the pass in options 用传入的 options 覆盖默认配置
	self.set(options);


	/*NEURON**********************************************************************/
	/**
	 * Artificial Neuron class 人工神经元类
	 *
	 * @constructor
	 */
	var Neuron = function () {
		this.value = 0;   // 当前输出值
		this.weights = []; // 对上一层各输入的连接权重
	}

	/**
	 * Initialize number of neuron weights to random clamped values.
	 * 用 [-1,1] 随机值初始化该神经元的权重（数量 = 输入数）。
	 *
	 * @param {nb} Number of neuron weights (number of inputs). 权重数量（即输入数）。
	 * @return void
	 */
	Neuron.prototype.populate = function (nb) {
		this.weights = [];
		for (var i = 0; i < nb; i++) {
			this.weights.push(self.options.randomClamped());
		}
	}


	/*LAYER***********************************************************************/
	/**
	 * Neural Network Layer class. 神经网络层类。
	 *
	 * @constructor
	 * @param {index} Index of this Layer in the Network. 该层在网络中的索引。
	 */
	var Layer = function (index) {
		this.id = index || 0;
		this.neurons = [];
	}

	/**
	 * Populate the Layer with a set of randomly weighted Neurons.
	 * 用一组随机权重的神经元填充该层；每个神经元有 nbInputs 个随机权重。
	 *
	 * @param {nbNeurons} Number of neurons. 本层神经元数量。
	 * @param {nbInputs} Number of inputs. 每个神经元的输入数（上一层的神经元数）。
	 * @return void
	 */
	Layer.prototype.populate = function (nbNeurons, nbInputs) {
		this.neurons = [];
		for (var i = 0; i < nbNeurons; i++) {
			var n = new Neuron();
			n.populate(nbInputs);
			this.neurons.push(n);
		}
	}


	/*NEURAL NETWORK**************************************************************/
	/**
	 * Neural Network class 神经网络类
	 *
	 * Composed of Neuron Layers. 由多个神经元层组成。
	 *
	 * @constructor
	 */
	var Network = function () {
		this.layers = [];
	}

	/**
	 * Generate the Network layers. 按结构生成网络的各层。
	 *
	 * @param {input} Number of Neurons in Input layer. 输入层神经元数。
	 * @param {hidden} Number of Neurons per Hidden layer. 各隐藏层神经元数（数组）。
	 * @param {output} Number of Neurons in Output layer. 输出层神经元数。
	 * @return void
	 */
	Network.prototype.perceptronGeneration = function (input, hiddens, output) {
		var index = 0;
		var previousNeurons = 0;
		var layer = new Layer(index);
		layer.populate(input, previousNeurons); // 输入层无入边，输入数为 0
		previousNeurons = input; // 下一层的“上一层层宽”为当前层神经元数
		this.layers.push(layer);
		index++;
		for (var i in hiddens) {
			// 对每个隐藏层重复：按上一层层宽创建神经元并赋予随机权重
			var layer = new Layer(index);
			layer.populate(hiddens[i], previousNeurons);
			previousNeurons = hiddens[i];
			this.layers.push(layer);
			index++;
		}
		var layer = new Layer(index);
		layer.populate(output, previousNeurons); // 输出层输入数 = 最后一层隐藏层神经元数
		this.layers.push(layer);
	}

	/**
	 * Create a copy of the Network (neurons and weights).
	 * 创建网络的可序列化副本：各层神经元数量 + 所有权重的扁平数组。
	 *
	 * @return Network data. 网络数据 { neurons, weights }。
	 */
	Network.prototype.getSave = function () {
		var datas = {
			neurons: [], // 各层神经元数量
			weights: []  // 每个神经元各输入的权重（按层、按神经元顺序压平）
		};

		for (var i in this.layers) {
			datas.neurons.push(this.layers[i].neurons.length);
			for (var j in this.layers[i].neurons) {
				for (var k in this.layers[i].neurons[j].weights) {
					datas.weights.push(this.layers[i].neurons[j].weights[k]);
				}
			}
		}
		return datas;
	}

	/**
	 * Apply network data (neurons and weights). 从保存的数据恢复网络结构与权重。
	 *
	 * @param {save} Copy of network data (neurons and weights). 网络数据副本。
	 * @return void
	 */
	Network.prototype.setSave = function (save) {
		var previousNeurons = 0;
		var index = 0;
		var indexWeights = 0;
		this.layers = [];
		for (var i in save.neurons) {
			// 按 save.neurons 重建各层并填入权重
			var layer = new Layer(index);
			layer.populate(save.neurons[i], previousNeurons);
			for (var j in layer.neurons) {
				for (var k in layer.neurons[j].weights) {
					layer.neurons[j].weights[k] = save.weights[indexWeights];
					indexWeights++;
				}
			}
			previousNeurons = save.neurons[i];
			index++;
			this.layers.push(layer);
		}
	}

	/**
	 * Compute the output of an input. 根据输入计算网络输出（前向传播）。
	 *
	 * @param {inputs} Set of inputs. 输入数组。
	 * @return Network output. 输出数组（最后一层各神经元的 value）。
	 */
	Network.prototype.compute = function (inputs) {
		// 将输入写入输入层各神经元的 value
		for (var i in inputs) {
			if (this.layers[0] && this.layers[0].neurons[i]) {
				this.layers[0].neurons[i].value = inputs[i];
			}
		}

		var prevLayer = this.layers[0]; // 上一层的输出作为当前层输入
		for (var i = 1; i < this.layers.length; i++) {
			for (var j in this.layers[i].neurons) {
				var sum = 0;
				for (var k in prevLayer.neurons) {
					// 当前神经元对上一层所有输出的加权和
					sum += prevLayer.neurons[k].value *
						this.layers[i].neurons[j].weights[k];
				}
				// 经激活函数得到当前神经元输出
				this.layers[i].neurons[j].value = self.options.activation(sum);
			}
			prevLayer = this.layers[i];
		}

		// 收集输出层所有神经元的 value 作为网络输出
		var out = [];
		var lastLayer = this.layers[this.layers.length - 1];
		for (var i in lastLayer.neurons) {
			out.push(lastLayer.neurons[i].value);
		}
		return out;
	}


	/*GENOME**********************************************************************/
	/**
	 * Genome class. 基因组类
	 *
	 * Composed of a score and a Neural Network (save data). 由得分与网络保存数据组成。
	 *
	 * @constructor
	 * @param {score} 得分（适应度）
	 * @param {network} 网络 getSave() 得到的数据
	 */
	var Genome = function (score, network) {
		this.score = score || 0;
		this.network = network || null;
	}


	/*GENERATION******************************************************************/
	/**
	 * Generation class. 代类（单代种群）
	 *
	 * Composed of a set of Genomes. 由多个基因组组成。
	 *
	 * @constructor
	 */
	var Generation = function () {
		this.genomes = [];
	}

	/**
	 * Add a genome to the generation. 将基因组按得分顺序插入当前代，保持列表有序。
	 *
	 * @param {genome} Genome to add. 要加入的基因组。
	 * @return void.
	 */
	Generation.prototype.addGenome = function (genome) {
		// 找到插入位置，使 genomes 始终保持按得分排序
		for (var i = 0; i < this.genomes.length; i++) {
			if (self.options.scoreSort < 0) {
				// 降序：分数高的在前
				if (genome.score > this.genomes[i].score) {
					break;
				}
			} else {
				// 升序
				if (genome.score < this.genomes[i].score) {
					break;
				}
			}
		}
		this.genomes.splice(i, 0, genome);
	}

	/**
	 * Breed two genomes to produce offspring(s). 两个基因组繁殖产生子代（交叉 + 变异）。
	 *
	 * @param {g1} Genome 1. 父代 1。
	 * @param {g2} Genome 2. 父代 2。
	 * @param {nbChilds} Number of offspring (children). 子代数量。
	 */
	Generation.prototype.breed = function (g1, g2, nbChilds) {
		var datas = [];
		for (var nb = 0; nb < nbChilds; nb++) {
			// 深拷贝父代 1 作为子代基础
			var data = JSON.parse(JSON.stringify(g1));
			for (var i in g2.network.weights) {
				// 遗传交叉：每个权重以 0.5 概率来自父代 2
				if (Math.random() <= 0.5) {
					data.network.weights[i] = g2.network.weights[i];
				}
			}
			// 变异：每个权重以 mutationRate 概率加上随机扰动
			for (var i in data.network.weights) {
				if (Math.random() <= self.options.mutationRate) {
					data.network.weights[i] += Math.random() *
						self.options.mutationRange *
						2 -
						self.options.mutationRange;
				}
			}
			datas.push(data);
		}
		return datas;
	}

	/**
	 * Generate the next generation. 根据当前代生成下一代（精英 + 随机 + 繁殖）。
	 *
	 * @return Next generation data array. 下一代网络数据数组（多份 { neurons, weights }）。
	 */
	Generation.prototype.generateNextGeneration = function () {
		var nexts = [];

		// 精英保留：得分最高的前 elitism 比例原样进入下一代
		for (var i = 0; i < Math.round(self.options.elitism *
				self.options.population); i++) {
			if (nexts.length < self.options.population) {
				nexts.push(JSON.parse(JSON.stringify(this.genomes[i].network)));
			}
		}

		// 随机个体：randomBehaviour 比例使用最优结构但权重全部随机
		for (var i = 0; i < Math.round(self.options.randomBehaviour *
				self.options.population); i++) {
			var n = JSON.parse(JSON.stringify(this.genomes[0].network));
			for (var k in n.weights) {
				n.weights[k] = self.options.randomClamped();
			}
			if (nexts.length < self.options.population) {
				nexts.push(n);
			}
		}

		// 繁殖填满剩余名额：按 (i, max) 配对繁殖，高分个体更常被选为父代
		var max = 0;
		while (true) {
			for (var i = 0; i < max; i++) {
				var childs = this.breed(this.genomes[i], this.genomes[max],
					(self.options.nbChild > 0 ? self.options.nbChild : 1));
				for (var c in childs) {
					nexts.push(childs[c].network);
					if (nexts.length >= self.options.population) {
						return nexts;
					}
				}
			}
			max++;
			if (max >= this.genomes.length - 1) {
				max = 0;
			}
		}
	}


	/*GENERATIONS*****************************************************************/
	/**
	 * Generations class. 多代管理类
	 *
	 * Holds previous Generations and current Generation. 保存历史代与当前代。
	 *
	 * @constructor
	 */
	var Generations = function () {
		this.generations = [];
	}

	/**
	 * Create the first generation. 创建第一代（全随机权重的种群）。
	 *
	 * @param {input} Input layer. 输入层（此处未用，用 options.network）。
	 * @param {hiddens} Hidden layer(s). 隐藏层（此处未用）。
	 * @param {output} Output layer. 输出层（此处未用）。
	 * @return First Generation. 第一代网络数据数组。
	 */
	Generations.prototype.firstGeneration = function (input, hiddens, output) {
		var out = [];
		for (var i = 0; i < self.options.population; i++) {
			var nn = new Network();
			nn.perceptronGeneration(self.options.network[0],
				self.options.network[1],
				self.options.network[2]);
			out.push(nn.getSave());
		}
		this.generations.push(new Generation());
		return out;
	}

	/**
	 * Create the next Generation. 基于当前代生成下一代并推进历史。
	 *
	 * @return Next Generation. 下一代网络数据数组；若无当前代则返回 false。
	 */
	Generations.prototype.nextGeneration = function () {
		if (this.generations.length == 0) {
			return false;
		}
		var gen = this.generations[this.generations.length - 1]
			.generateNextGeneration();
		this.generations.push(new Generation());
		return gen;
	}

	/**
	 * Add a genome to the current Generation. 将基因组加入当前代。
	 *
	 * @param {genome} 基因组
	 * @return False if no Generations to add to. 若尚无任何代则返回 false。
	 */
	Generations.prototype.addGenome = function (genome) {
		if (this.generations.length == 0) return false;
		return this.generations[this.generations.length - 1].addGenome(genome);
	}


	/*SELF************************************************************************/
	self.generations = new Generations();

	/**
	 * Reset and create a new Generations object. 重置并新建多代管理对象。
	 *
	 * @return void.
	 */
	self.restart = function () {
		self.generations = new Generations();
	}

	/**
	 * Create the next generation. 获取下一代：若无历史则创建第一代，否则由当前代进化得到。
	 *
	 * @return Neural Network array for next Generation. 可执行 compute() 的 Network 实例数组。
	 */
	self.nextGeneration = function () {
		var networks = [];

		if (self.generations.generations.length == 0) {
			networks = self.generations.firstGeneration();
		} else {
			networks = self.generations.nextGeneration();
		}

		// 将网络数据还原为 Network 实例
		var nns = [];
		for (var i in networks) {
			var nn = new Network();
			nn.setSave(networks[i]);
			nns.push(nn);
		}

		if (self.options.lowHistoric) {
			// 仅保留分数、释放上一代网络数据以省内存
			if (self.generations.generations.length >= 2) {
				var genomes =
					self.generations
					.generations[self.generations.generations.length - 2]
					.genomes;
				for (var i in genomes) {
					delete genomes[i].network;
				}
			}
		}

		if (self.options.historic != -1) {
			// 裁剪过旧的历史代
			if (self.generations.generations.length > self.options.historic + 1) {
				self.generations.generations.splice(0,
					self.generations.generations.length - (self.options.historic + 1));
			}
		}

		return nns;
	}

	/**
	 * Adds a new Genome with specified Neural Network and score.
	 * 记录某网络的得分，将其加入当前代（鸟死亡时由游戏调用）。
	 *
	 * @param {network} Neural Network. 神经网络实例。
	 * @param {score} Score value. 得分。
	 * @return void.
	 */
	self.networkScore = function (network, score) {
		self.generations.addGenome(new Genome(score, network.getSave()));
	}
}

module.exports = Neuroevolution;
