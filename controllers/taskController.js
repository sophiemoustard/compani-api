const Boom = require('boom');
const flat = require('flat');

const translate = require('../helpers/translate');
const Task = require('../models/Task');
const User = require('../models/User');

const { language } = translate;

const create = async (req) => {
  try {
    const task = new Task(req.payload);
    await task.save();
    const users = await User.find();
    if (users.length > 0) {
      await User.updateMany({}, {
        $push: {
          procedure: {
            task: task._id,
          }
        }
      });
    }
    return {
      message: translate[language].taskCreated,
      data: {
        task
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const update = async (req) => {
  try {
    const taskUpdated = await Task.findOneAndUpdate({
      _id: req.params._id
    }, {
      $set: flat(req.payload)
    }, {
      new: true
    });
    if (!taskUpdated) {
      return Boom.notFound(translate[language].taskNotFound);
    }
    return {
      message: translate[language].taskUpdated,
      data: {
        task: taskUpdated
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showAll = async (req) => {
  try {
    const tasks = await Task.find(req.query).select('_id name').lean();
    if (tasks.length === 0) {
      return Boom.notFound(translate[language].tasksShowAllNotFound);
    }
    return {
      message: translate[language].tasksShowAllFound,
      data: {
        tasks
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const showById = async (req) => {
  try {
    const task = await Task.findOne({
      _id: req.params._id
    }).lean();
    if (!task) {
      return Boom.notFound(translate[language].taskNotFound);
    }
    return {
      success: true,
      message: translate[language].taskFound,
      data: {
        task
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

const remove = async (req) => {
  try {
    const taskDeleted = await Task.findByIdAndRemove({
      _id: req.params._id
    });
    if (!taskDeleted) {
      return Boom.notFound(translate[language].taskNotFound);
    }
    await User.update({}, {
      $pull: {
        procedure: {
          task: req.params._id
        }
      }
    }, {
      multi: true
    });
    return {
      message: translate[language].taskRemoved,
      data: {
        taskDeleted
      }
    };
  } catch (e) {
    req.log('error', e);
    return Boom.badImplementation();
  }
};

module.exports = {
  create,
  update,
  showAll,
  showById,
  remove
};
