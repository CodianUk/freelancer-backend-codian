// @import Packages
import mongoose from "mongoose";
import crypto from "crypto";

// @import Redis
import Redis from "ioredis";
const redisClient = new Redis(process.env.REDIS_URL);

// @import Error Classes
import BADREQUEST from "../errors/badRequest.js";
import UNAUTHORIZED from "../errors/unAuthorized.js";
import NOTFOUND from "../errors/notFound.js";

// @import Models
import { Startup } from "../models/startup.js";
// import {Record} from "../models/record.js";
import {Record} from "../models/records.js";
import { User } from "../models/user.js";
import { StartupStatus } from "../models/startupStatus.js";
import { ProjectRoles } from "../models/projectRoles.js";
import { Todos } from "../models/todos.js";
import { Warning } from "../models/warnings.js";
import { OneTimeOrder } from "../models/oneTimeOrder.js";
import { RemoveMember } from "../models/removeMember.js";
import { Category } from "../models/category.js";
import {Subcategory } from "../models/subcategory.js";
//------------------------------------------------------------

// crypto
const algorithm = "aes-256-ctr";
const initVector = process.env.CRYPTO_INIT_VECTOR;
const key = process.env.CRYPTO_ENCRIPTION_KEY;

const encrypt = (text) => {
  let cipher = crypto.createCipheriv(algorithm, key, initVector);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return encrypted.toString("hex");
};

const decrypt = (hash) => {
  // let iv = Buffer.from(initVector, 'hex');
  let iv = initVector;
  let encryptedText = Buffer.from(hash, "hex");
  let decipher = crypto.createDecipheriv(algorithm, key, iv);
  let decrypted = decipher.update(encryptedText);
  decrypted = Buffer.concat([decrypted, decipher.final()]);
  return decrypted.toString();
};

//------------------------------------------------------------

// @desc    Add a new role
const addProjectRole = async (req, res, next) => {
  let projectRoles;
  try {
    const { startupid, newRole } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    projectRoles = await ProjectRoles.findOneAndUpdate(
      { startupid: startupid, userid: req.user._id },
      {
        $push: {
          roles: newRole,
        },
      },
      { new: true, runValidators: true }
    );
    if (!projectRoles) {
      projectRoles = new ProjectRoles({
        startupid: startupid,
        userid: req.user._id,
        roles: [newRole],
      });
      const validationErrors = projectRoles.validateSync();

      if (validationErrors) {
        return next(new BADREQUEST(validationErrors.message));
      }
      await projectRoles.save();
    }
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", projectRoles });
};

// @desc    Get all roles
const getAllRoles = async (req, res, next) => {
  let projectRoles;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    projectRoles = await ProjectRoles.find({ startupid: startupid });
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", projectRoles });
};

// @desc    Delete a role
const deleteRole = async (req, res, next) => {
  try {
    const { startupid, roleid } = req.body;
    if (!startupid) {
      return next(new BADREQUEST("Please provide a startup id"));
    }
    if (!roleid) {
      return next(new BADREQUEST("Please provide a role id"));
    }

    // Find the project roles associated with the startup
    const projectRoles = await ProjectRoles.findOne({ startupid: startupid });

    if (!projectRoles) {
      return next(new NOTFOUND("No Roles found"));
    }

    // Ensure the requesting user is authorized to perform this action
    if (!projectRoles.userid.equals(req.user._id)) {
      return next(new BADREQUEST("You are not authorized to perform this action"));
    }

    // Find the index of the role with the specified _id
    const roleIndex = projectRoles.roles.findIndex(role => role._id.toString() === roleid);

    console.log('roleIndex' , roleIndex);
    console.log('projectRoles.roles' , projectRoles.roles);

    if (roleIndex === -1) {
      return next(new NOTFOUND("No role found"));
    }

    // Remove the role from the roles array
    projectRoles.roles.splice(roleIndex, 1);

    // Save the updated projectRoles document
    await projectRoles.save();

    // Return a success response
    return res.status(200).json({ status: "OK", projectRoles });
  } catch (error) {
    return next(error);
  }
};




// @desc    Update a role
const updateRole = async (req, res, next) => {
  let projectRoles;
  try {
    const { startupid, roleid, newRole } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!roleid) return next(new BADREQUEST("Please provide a role id"));
    projectRoles = await ProjectRoles.findOne({ startupid: startupid });
    if (!projectRoles) return next(new NOTFOUND("No Roles found"));
    if (!projectRoles.userid.equals(req.user._id))
      return next(
        new BADREQUEST("You are not authorized to perform this action")
      );
    const role = projectRoles.roles.id(roleid);
    if (!role) return next(new NOTFOUND("No role found"));

    // only update the values that are available in object newRole
    role.set(newRole);

    await projectRoles.save();
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", projectRoles });
};

// @desc    Add a Startup Todo
// const addTodo = async (req, res, next) => {
//   let todos;
//   try {
//     const { startupid, newTodo } = req.body;
//     if (!startupid) return next(new BADREQUEST("Please provide a startup id"));

//     // Fetch the members of the startup
//     const startup = await Startup.findById(startupid);
//     if (!startup) return next(new BADREQUEST("Startup not found"));

//     // Get an array of member IDs from the startup
//     const startupMembers = startup.members.map((member) => ({
//       user: member.member,
//       verified: false, // Add the verified property with a default value of false
//     }));

//     // Ensure the 'team' field in newTodo is an array of objects with user and verified properties
//     newTodo.team = startupMembers;

//     todos = await Todos.findOneAndUpdate(
//       { startupid: startupid, userid: req.user._id },
//       {
//         $push: {
//           "todos.$[elem].team": { $each: startupMembers }, // Add startup members to the team in todo
//         },
//       },
//       {
//         new: true,
//         runValidators: true,
//         arrayFilters: [{ "elem._id": { $exists: true } }],
//       }
//     ).populate({
//       path: "todos.team.user",
//       select: "_id avatar name email verified", // Populate id, avatar, name, email, and verified for team members
//     });

//     if (!todos) {
//       if (!newTodo) return next(new BADREQUEST("Please provide a todo"));
//       todos = new Todos({
//         startupid: startupid,
//         userid: req.user._id,
//         todos: [
//           {
//             ...newTodo,
//             team: startupMembers, // Add startup members to the team in todo
//           },
//         ],
//       });

//       const validationErrors = todos.validateSync();
//       if (validationErrors) {
//         return next(new BADREQUEST(validationErrors.message));
//       }
//       await todos.save();
//       todos = await Todos.findById(todos._id).populate({
//         path: "todos.team.user",
//         select: "_id avatar name email verified", // Populate id, avatar, name, email, and verified for team members
//       });
//     }
//   } catch (error) {
//     return next(error);
//   }
//   return res.status(201).json({ status: "OK", todos });
// };

// const addTodo = async (req, res, next) => {
//   let todos;
//   try {
//     const { startupid, newTodo } = req.body;
//     if (!startupid) return next(new BADREQUEST("Please provide a startup id"));

//     // Fetch the members of the startup
//     const startup = await Startup.findById(startupid);
//     if (!startup) return next(new BADREQUEST("Startup not found"));

//     // Get an array of member IDs from the startup
//     const startupMembers = startup.members.map((member) => ({
//       user: member.member,
//       verified: false, // Add the verified property with a default value of false
//     }));

//     // Ensure the 'team' field in newTodo is an array of objects with user and verified properties
//     newTodo.team = startupMembers;

//     // Check if contributors is an array
//     if (!Array.isArray(newTodo.contributors)) {
//       return next(new BADREQUEST("Contributors must be an array of user IDs"));
//     }

//     // Remove contributors from the team if they exist in the team
//     newTodo.team = newTodo.team.filter((teamMember) =>
//       !newTodo.contributors.includes(teamMember.user.toString())
//     );

//     // Fetch additional user information for contributors
//     const contributorsWithInfo = await User.find(
//       { _id: { $in: newTodo.contributors } },
//       "_id avatar name email"
//     );

//     // Construct the contributors array with the desired structure
//     newTodo.contributors = contributorsWithInfo.map((contributor) => ({
//       iscomplete: false,
//       user: {
//         avatar: contributor.avatar,
//         _id: contributor._id,
//         email: contributor.email,
//         name: contributor.name,
//       },
//     }));

//     // Fetch additional user information for team members
//     const teamMembersWithInfo = await User.find(
//       { _id: { $in: newTodo.team.map((tm) => tm.user) } },
//       "_id avatar name email verified"
//     );

//     // Construct the team array with the desired structure
//     newTodo.team = newTodo.team.map((teamMember) => ({
//       verified: teamMember.verified,
//       _id: teamMember.user,
//       user: teamMembersWithInfo.find((tm) => tm._id.equals(teamMember.user)),
//     }));

//     todos = await Todos.findOneAndUpdate(
//       { startupid: startupid, userid: req.user._id },
//       {
//         $push: {
//           "todos.$[elem].team": { $each: newTodo.team }, // Add startup members to the team in todo
//         },
//         $addToSet: {
//           "todos.$[elem].contributors": { $each: newTodo.contributors }, // Add contributors to the contributors array
//         },
//       },
//       {
//         new: true,
//         runValidators: true,
//         arrayFilters: [{ "elem._id": { $exists: true } }],
//       }
//     ).populate({
//       path: "todos.contributors.user", // Populate contributors.user path
//       select: "_id avatar name email",
//     });

//     if (!todos) {
//       if (!newTodo) return next(new BADREQUEST("Please provide a todo"));
//       todos = new Todos({
//         startupid: startupid,
//         userid: req.user._id,
//         todos: [
//           {
//             ...newTodo,
//             team: newTodo.team, // Add startup members to the team in todo
//             contributors: newTodo.contributors, // Add contributors to the contributors array
//           },
//         ],
//       });

//       const validationErrors = todos.validateSync();
//       if (validationErrors) {
//         return next(new BADREQUEST(validationErrors.message));
//       }
//       await todos.save();
//       todos = await Todos.findById(todos._id).populate({
//         path: "todos.contributors.user", // Populate contributors.user path
//         select: "_id avatar name email",
//       });
//     }
//   } catch (error) {
//     return next(error);
//   }
//   return res.status(201).json({ status: "OK", todos });
// };

// const addTodo = async (req, res, next) => {
//   try {
//     const { startupid, newTodo } = req.body;
//     if (!startupid) return next(new BADREQUEST("Please provide a startup id"));

//     // Fetch the members of the startup
//     const startup = await Startup.findById(startupid);
//     if (!startup) return next(new BADREQUEST("Startup not found"));

//     // Get an array of member IDs from the startup
//     const startupMembers = startup.members.map((member) => member.member);

//     // Initialize contributors and team arrays
//     const contributors = [];
//     const team = [];

//     // Check if contributors is an array in the payload
//     if (Array.isArray(newTodo.contributors)) {
//       for (const contributorId of newTodo.contributors) {
//         // Find the contributor in startup members
//         if (startupMembers.includes(contributorId)) {
//           // Fetch user details from User Schema based on contributorId
//           const user = await User.findById(contributorId);
//           if (user) {
//             contributors.push({
//               _id: user._id, // Use user's _id
//               name: user.name,
//               avatar: user.avatar,
//               verified: false,
//             });
//             // Remove the contributor from the team if they are already there
//             const teamIndex = team.findIndex((t) => t._id.toString() === user._id.toString());
//             if (teamIndex !== -1) {
//               team.splice(teamIndex, 1);
//             }
//           }
//         }
//       }
//     }

//     // Loop through the remaining startup members and push them to team
//     for (const memberUserId of startupMembers) {
//       if (!contributors.some((c) => c._id.toString() === memberUserId.toString())) {
//         // Fetch user details from User Schema based on memberUserId
//         const user = await User.findById(memberUserId);
        
//         if (user) {
//           team.push({
//             _id: user._id,
//             name: user.name,
//             avatar: user.avatar,
//             verified: false,
//           });
//         }
//       }
//     }

//     // Create a new todo object
//     const newTodoObject = {
//       title: newTodo.title,
//       description: newTodo.description,
//       // Add other fields from newTodo as needed
//       dueDate: newTodo.dueDate, // Ensure dueDate is provided
//       contributors: contributors,
//       team: team,
//     };

//     // Find the user's existing todos
//     let userTodos = await Todos.findOne({ startupid: startupid, userid: req.user._id });

//     if (!userTodos) {
//       // If no existing todos found, create a new document
//       userTodos = new Todos({
//         startupid: startupid,
//         userid: req.user._id,
//         todos: [newTodoObject],
//       });
//     } else {
//       // If existing todos found, push the new todo object into the todos array
//       userTodos.todos.push(newTodoObject);
//     }

//     // Save the user's todos
//     await userTodos.save();

//     return res.status(201).json({ status: "OK", todos: userTodos });
//   } catch (error) {
//     return next(error);
//   }
// };


const addTodo = async (req, res, next) => {
  try {
    const { startupid, newTodo } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));

    // Fetch the members of the startup
    const startup = await Startup.findById(startupid);
    if (!startup) return next(new BADREQUEST("Startup not found"));

    // Get an array of member IDs from the startup
    const startupMembers = startup.members.map((member) => member.member);

    // Initialize contributors and team arrays
    const contributors = [];
    const team = [];

    // Check if contributors is an array in the payload
    if (Array.isArray(newTodo.contributors)) {
      for (const contributorId of newTodo.contributors) {
        // Find the contributor in startup members
        if (startupMembers.includes(contributorId)) {
          // Fetch user details from User Schema based on contributorId
          const user = await User.findById(contributorId);
          if (user) {
            contributors.push({
              _id: user._id, // Use user's _id
              name: user.name,
              avatar: user.avatar,
              verified: false,
              iscomplete: false, // Add iscomplete property
            });
            // Remove the contributor from the team if they are already there
            const teamIndex = team.findIndex((t) => t._id.toString() === user._id.toString());
            if (teamIndex !== -1) {
              team.splice(teamIndex, 1);
            }
          }
        }
      }
    }

    // Loop through the remaining startup members and push them to team
    for (const memberUserId of startupMembers) {
      if (!contributors.some((c) => c._id.toString() === memberUserId.toString())) {
        // Fetch user details from User Schema based on memberUserId
        const user = await User.findById(memberUserId);

        if (user) {
          team.push({
            _id: user._id,
            name: user.name,
            avatar: user.avatar,
            verified: false,
            iscomplete: false, // Add iscomplete property
          });
        }
      }
    }

    // Create a new todo object
    const newTodoObject = {
      title: newTodo.title,
      description: newTodo.description,
      isOwnerId : newTodo.isOwnerId,
      // Add other fields from newTodo as needed
      file : newTodo.file,
      dueDate: newTodo.dueDate, // Ensure dueDate is provided
      status: "OnGoing", // Set default status
      contributors: contributors,
      team: team,
    };

    // Create a new Todos document directly using the updated model
    const userTodos = new Todos({
      startupid: startupid,
      userid: req.user._id,
      ...newTodoObject, // Spread the newTodoObject properties
    });

    // Save the user's todos
    await userTodos.save();

    return res.status(201).json({ status: "OK", todos: userTodos });
  } catch (error) {
    return next(error);
  }
};



const updateContributorStatus = async (req, res, next) => {
  try {
    const { todoId, contributorId } = req.body;

    // Find the Todos document by todoId
    const todos = await Todos.findById(todoId);

    if (!todos) {
      return next(new BADREQUEST("Todo not found"));
    }

    // Find the specific contributor within the Todos document by contributorId
    const contributor = todos.contributors.find(
      (c) => c._id.toString() === contributorId.toString()
    );

    if (!contributor) {
      return next(new BADREQUEST("Contributor not found"));
    }

    // Update the contributor's iscomplete property to true
    contributor.iscomplete = true;

    // Save the updated Todos document
    await todos.save();

    return res.status(200).json({ status: "OK", message: "Contributor status updated" });
  } catch (error) {
    return next(error);
  }
};




const updateTeamMemberStatus = async (req, res, next) => {
  try {
    const { todoId, teamMemberId } = req.body;

    // Find the Todos document by todoId
    const todos = await Todos.findById(todoId);

    if (!todos) {
      return next(new BADREQUEST("Todo not found"));
    }

    // Find the team member within the Todos document by teamMemberId
    const teamMember = todos.team.find(
      (tm) => tm._id.toString() === teamMemberId.toString()
    );

    if (!teamMember) {
      return next(new BADREQUEST("Team member not found"));
    }

    // Update the team member's verified property to true
    teamMember.verified = true;

    // Save the updated Todos document
    await todos.save();

    return res.status(200).json({ status: "OK", message: "Team member status updated" });
  } catch (error) {
    return next(error);
  }
};




// @desc    Get all todos
const getTodos = async (req, res, next) => {
  let todos;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    todos = await Todos.find({ startupid: startupid }).populate({
      path: "todos.members",
      select: "_id avatar name email",
    });
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", todos });
};

// @desc    Delete a todo
const deleteTodo = async (req, res, next) => {
  let todos = [];
  try {
    const { startupid, todoid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!todoid) return next(new BADREQUEST("Please provide a todo id"));
    todos = await Todos.findOne({ startupid: startupid });
    if (!todos) return next(new NOTFOUND("No todos found"));
    if (!todos.userid.equals(req.user._id))
      return next(
        new BADREQUEST("You are not authorized to perform this action")
      );
    const temptodo = todos.todos.id(todoid);
    console.log(temptodo);
    if (!temptodo) return next(new NOTFOUND("No todo found"));
    todos.todos = todos.todos.filter((todo) => todo._id !== temptodo._id);
    await todos.save();
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", todos: todos.todos });
};

// @desc    Update a todo
const updateTodo = async (req, res, next) => {
  let todos;
  try {
    const { startupid, todoid, newTodo } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!todoid) return next(new BADREQUEST("Please provide a todo id"));
    if (!newTodo) return next(new BADREQUEST("Please provide a todo"));
    todos = await Todos.findOne({ startupid: startupid });
    if (!todos) return next(new NOTFOUND("No todos found"));
    if (!todos.userid.equals(req.user._id))
      return next(
        new BADREQUEST("You are not authorized to perform this action")
      );
    const todo = todos.todos.id(todoid);
    if (!todo) return next(new NOTFOUND("No todo found"));
    todo.set(newTodo);
    await todos.save();
    todos = await Todos.findById(todos._id).populate({
      path: "todos.members",
      select: "_id avatar name email",
    });
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", todos });
};

// @desc    Add a new member in Startup
const addMember = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, newMember } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!newMember) return next(new BADREQUEST("Please provide a member"));
    startUp = await Startup.findOneAndUpdate(
      { _id: startupid, userid: req.user._id },
      {
        $push: {
          members: newMember,
        },
      },
      { new: true, runValidators: true }
    ).populate({
      path: "members.member",
      select: "_id avatar name email",
    });
    if (!startUp) return next(new NOTFOUND("Startup not found"));
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", members: startUp.members });
};

//@desc    Get all members of a startup
const getMembers = async (req, res, next) => {
  let startUp;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    startUp = await Startup.findOne({
      _id: startupid,
      userid: req.user._id,
    }).populate({
      path: "members.member",
      select: "_id avatar name email",
    });
    if (!startUp) return next(new NOTFOUND("Startup not found"));
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", members: startUp.members });
};

// @desc    Get all members of all startups
const getAllStartupMembers = async (req, res, next) => {
  let members = [];
  try {
    let allstartups = await Startup.find({ userid: req.user._id }).populate({
      path: "members.member",
      select: "_id avatar name",
    });
    allstartups.forEach((startup) => {
      startup.members.forEach((member) => {
        members.push(member.member);
      });
    });
    return res.status(200).json({ status: "OK", members });
  } catch (error) {
    return next(error);
  }
};

// remove member from startup
const removeStartupMember = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, memberid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!memberid) return next(new BADREQUEST("Please provide a member id"));

    startUp = await Startup.findOneAndUpdate(
      { _id: startupid, userid: req.user._id },
      {
        $pull: {
          members: { member: memberid },
        },
      },
      { new: true, runValidators: true }
    ).populate({
      path: "members.member",
      select: "_id avatar name email",
    });

    if (!startUp) return next(new NOTFOUND("Startup not found"));
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", members: startUp.members });
};


// @desc    Remove a member from Startup
const requestMemberRemoval = async (req, res, next) => {
  let requestRemoval;
  try {
    const { startupid, memberid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!memberid) return next(new BADREQUEST("Please provide a member id"));
    requestRemoval = await RemoveMember.findOne({
      startupid: startupid,
      memberid: memberid,
    });
    if (!requestRemoval) {
      requestRemoval = await RemoveMember.create({
        startupid: startupid,
        memberid: memberid,
      });
      await requestRemoval.save();
      return res.status(201).json({ status: "OK", requestRemoval });
    } else if (requestRemoval.status === "Pending") {
      return next(new BADREQUEST("Request already sent"));
    }
  } catch (error) {
    return next(error);
  }
};

// @desc    Update a member of a startup
const updateMember = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, memberid, newMember } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!memberid) return next(new BADREQUEST("Please provide a member id"));
    if (!newMember)
      return next(new BADREQUEST("Please provide a new member object"));
    startUp = await Startup.findOne({
      _id: startupid,
    });
    if (!startUp) return next(new NOTFOUND("Startup not found"));
    if (!startUp.userid.equals(req.user._id))
      return next(
        new UNAUTHORIZED("You are not authorized to perform this action")
      );
    const member = startUp.members.id(memberid);
    if (!member) return next(new NOTFOUND("Member not found"));
    member.set(newMember);
    const validationError = member.validateSync();
    if (validationError) return next(new BADREQUEST(validationError.message));
    await startUp.save();
  } catch (error) {
    return next(error);
  }
  res.status(200).json({ status: "OK", members: startUp.members });
};

// @desc    add a Milestone
const addMilestone = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, newMilestone } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    startUp = await Startup.findById({
      _id: startupid,
    });
    if (!startUp) return next(new NOTFOUND("Startup not found"));
    if (!startUp.userid.equals(req.user._id))
      return next(
        new UNAUTHORIZED("You are not authorized to perform this action")
      );
    startUp.milestones.push(newMilestone);
    const validationError = startUp.validateSync();
    if (validationError) return next(new BADREQUEST(validationError.message));
    await startUp.save();
  } catch (error) {
    return next(error);
  }
  res.status(201).json({ status: "OK", milestones: startUp.milestones });
};

// @desc    Update a Milestone
const updateMilestone = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, milestoneid, newMilestone } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!milestoneid)
      return next(new BADREQUEST("Please provide a milestone id"));
    startUp = await Startup.findOne({
      _id: startupid,
    });
    if (!startUp) return next(new NOTFOUND("Startup not found"));
    console.log(startUp.userid, req.user._id);
    if (!startUp.userid.equals(req.user._id))
      return next(
        new UNAUTHORIZED("You are not authorized to perform this action")
      );
    const index = startUp.milestones.findIndex((m) =>
      m._id.equals(milestoneid)
    );
    if (index === -1) return next(new NOTFOUND("Milestone not found"));
    startUp.milestones[index].set(newMilestone);
    const validationError = startUp.validateSync();
    if (validationError) return next(new BADREQUEST(validationError.message));
    await startUp.save();
  } catch (error) {
    return next(error);
  }
  res.status(200).json({ status: "OK", milestones: startUp.milestones });
};

// @desc    Remove a Milestone
const removeMilestone = async (req, res, next) => {
  let startUp;
  try {
    const { startupid, milestoneid } = req.body;
    startUp = await Startup.findOneAndUpdate(
      {
        _id: startupid,
        userid: req.user._id,
      },
      {
        $pull: {
          milestones: { _id: milestoneid },
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );
    if (!startUp) return next(new NOTFOUND("Startup not found"));
  } catch (error) {
    return next(error);
  }
  res.status(200).json({ status: "OK", milestones: startUp.milestones });
};

// @desc    Save Startup Onboarding
const startupOnboarding = async (req, res, next) => {
  let startUp;
  try {
    const { startupid } = req.body;
    if (startupid) {
      startUp = await Startup.findByIdAndUpdate(
        {
          _id: startupid,
          userid: req.user._id,
        },
        {
          $set: {
            ...req.body,
            onboarding: { step: req.body.formStep },
          },
        },
        { new: true, runValidators: true }
      );
      if (!startUp) {
        return next(new NOTFOUND("Startup not found"));
      }
    } else {
      startUp = new Startup({
        userid: req.user._id,
        ...req.body,
        onboarding: { step: req.body.formStep },
      });
      const validationErrors = startUp.validateSync();
      if (validationErrors) {
        return next(new BADREQUEST(validationErrors.message));
      }
      await startUp.save();
    }
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", startUp });
};

const addRecord = async (req, res, next) => {
  try {
    const { startupid } = req.body;

    // Check if the startup exists
    const startupExists = await Startup.findById(startupid);

    if (!startupExists) {
      return next(new NOTFOUND("Startup not found"));
    }

    const record = new Record({
      startup: startupid,
      ...req.body,
    });

    const validationErrors = record.validateSync();

    if (validationErrors) {
      return next(new BADREQUEST(validationErrors.message));
    }

    await record.save();

    return res.status(201).json({ status: "OK", record });
  } catch (error) {
    return next(error);
  }
};

// @desc    Publish StartUp
const publishStartup = async (req, res, next) => {
  let continueOnboarding;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));

    let encryptedData = encrypt(startupid.toString());

    continueOnboarding = await Startup.findOneAndUpdate(
      { _id: startupid },
      {
        $set: {
          ...req.body,
          onboarding: { step: 5, status: true },
          url: "startup/byUrl/" + encryptedData,
        },
      },
      { new: true, runValidators: true }
    );
    if (continueOnboarding) {
      let AddStartupStatus = await StartupStatus.create({
        startupid: startupid,
      });
      if (!AddStartupStatus) {
        return next(new BADREQUEST("Something went wrong! Please try again"));
      }
      AddStartupStatus.save();
    }
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", continueOnboarding });
};

//@desc    Get StartUp by url
const getStartupbyUrl = async (req, res, next) => {
  try {
    let hash = req.params.id;
    let startupid = decrypt(hash);

    const userid = req.user?._id;
    let startup = {};
    let projectRoles = [];
    let todos = [];

    if (!startupid) {
      return next(new BADREQUEST("Please provide a startup id"));
    }
    startup = await Startup.findOne({
      _id: startupid,
    }).populate({
      path: "members.member",
      select: "_id name avatar email",
    });
    if (!startup) {
      return next(new NOTFOUND("Startup not found"));
    }
    projectRoles = await ProjectRoles.find({
      startupid: startupid,
    });
    let found;
    if (!userid) {
      return res.status(200).json({ status: "OK", startup, projectRoles });
    } else {
      found = startup.members.find(
        (member) => member.member._id.toString() === userid.toString()
      );
    }
    if (!found && !startup.userid.equals(userid)) {
      return res.status(200).json({ status: "OK", startup, projectRoles });
    } else {
      if (startup.userid.equals(userid) || found) {
        todos = await Todos.find({ startupid: startupid }).populate({
          path: "todos.members",
          select: "_id name avatar email",
        });
        return res
          .status(200)
          .json({ status: "OK", startup, todos, projectRoles });
      }
    }
  } catch (err) {
    return next(err);
  }
};

// @desc    Get StartUp
// const getStartupbyId = async (req, res, next) => {
//   const userid = req.user?._id;
//   const userRole = req.user?.role;
//   const { startupid } = req.body;
//   let startup = {};
//   let projectRoles = [];
//   let todos = [];
//   try {
//     if (!startupid) {
//       return next(new BADREQUEST("Please provide a startup id"));
//     }

//     startup = await Startup.findOne({
//       _id: startupid,
//     }).populate({
//       path: "members.member",
//       select: "_id name avatar email",
//     });
//     if (!startup) {
//       return next(new NOTFOUND("Startup not found"));
//     }
//     projectRoles = await ProjectRoles.find({
//       startupid: startupid,
//     });
//     let found;
//     if (userRole === "admin") {
//       return res.status(200).json({ status: "OK", startup, projectRoles });
//     }
//     if (!userid) {
//       return res.status(200).json({ status: "OK", startup, projectRoles });
//     } else {
//       found = startup.members.find(
//         (member) => member.member._id.toString() === userid.toString()
//       );
//     }
//     console.log("Hello");
//     console.log(userid, startup.userid, found);
//     if (!found && !startup.userid.equals(userid)) {
//       return res.status(200).json({ status: "OK", startup, projectRoles });
//     } else if (startup.userid.equals(userid) || found) {
//       console.log(userid);
//       todos = await Todos.find({ startupid: startupid }).populate({
//         path: "todos.members",
//         select: "_id name avatar email",
//       });
//       return res
//         .status(200)
//         .json({ status: "OK", startup, todos, projectRoles });
//     }
//   } catch (error) {
//     return next(error);
//   }
// };
const getStartupbyId = async (req, res, next) => {
  const userid = req.user?._id;
  const userRole = req.user?.role;
  const { startupid } = req.body;
  let startup = {};
  let projectRoles = [];
  let todos = [];
  try {
    if (!startupid) {
      return next(new BADREQUEST("Please provide a startup id"));
    }

    startup = await Startup.findOne({
      _id: startupid,
    })
    .populate({
      path: "members.member",
      select: "_id name avatar email", // Add any other fields you want to retrieve
    })
    .populate({
      path: "userid",
      select: "_id name avatar email", // Add any other fields you want to retrieve
    });

    if (!startup) {
      return next(new NOTFOUND("Startup not found"));
    }

    projectRoles = await ProjectRoles.find({
      startupid: startupid,
    });

    let found;

    if (userRole === "admin") {
      return res.status(200).json({ status: "OK", startup, projectRoles });
    }

    if (!userid) {
      return res.status(200).json({ status: "OK", startup, projectRoles });
    } else {
      found = startup.members.find(
        (member) => member.member._id.toString() === userid.toString()
      );
    }

    if (!found && !startup.userid.equals(userid)) {
      return res.status(200).json({ status: "OK", startup, projectRoles });
    } else if (startup.userid.equals(userid) || found) {
      todos = await Todos.find({ startupid: startupid }).populate({
        path: "todos.members",
        select: "_id name avatar email",
      });

      // Include user information based on the userid in the startup data
      const userInformation = await User.findOne({
        _id: startup.userid,
      }).select("_id name avatar email"); // Add any other fields you want to retrieve

      return res
        .status(200)
        .json({ status: "OK", startup, user: userInformation, todos, projectRoles });
    }
  } catch (error) {
    return next(error);
  }
};


const deleteStartupById = async (req, res, next) => {
  const { startupid } = req.params; // Assuming you send the startup ID as a URL parameter

  try {
    // Find the startup by its ID
    const startup = await Startup.findById(startupid);

    // Check if the startup exists
    if (!startup) {
      return next(new NOTFOUND('Startup not found'));
    }

    // Delete the startup
    await Startup.findByIdAndDelete(startupid);

    res.status(200).json({ status: 'OK', message: 'Startup deleted successfully' });
  } catch (error) {
    return next(new SERVERERROR(error.message));
  }
};



const getAllStartups = async (req, res, next) => {
  try {
    const startUps = await Startup.find({});
    
    // Create an array of promises to fetch the role count and roles array for each startup
    const startupDataPromises = startUps.map(async (startup) => {
      const roleCount = await ProjectRoles.countDocuments({ startupid: startup._id });
      const roles = await ProjectRoles.find({ startupid: startup._id });
      return { startup, roleCount, roles };
    });

    // Wait for all promises to resolve
    const startupsWithRoleData = await Promise.all(startupDataPromises);

    res.status(200).json({ status: "OK", startups: startupsWithRoleData });
  } catch (error) {
    return next(error);
  }
};




// const getAllStartups = async (req, res, next) => {
//   let startUps = [];
//   let startupsstatus = [];
//   let temparray = [];
//   try {
//     if (req.user.role === "Startup Owner") {
//       startUps = await Startup.find({
//         userid: req.user._id,
//       });
//       startupsstatus = await StartupStatus.find({
//         startupid: { $in: startUps.map((startup) => startup._id) },
//       });
//       for (const startup of startUps) {
//         const projectRoles = await ProjectRoles.find({ startupid: startup._id });
//         const temp = {
//           _id: startup._id,
//           status:
//             startup.onboarding.status === false
//               ? "Draft"
//               : startupsstatus.find((startupstatus) =>
//                   startupstatus.startupid.equals(startup._id)
//                 )?.status === "Approved"
//               ? "Approved"
//               : "Pending",
//           userid: startup.userid,
//           logo: startup.logo,
//           businessName: startup.businessName,
//           category: startup.category,
//           budget: startup.budget,
//           stage: startup.stage,
//           roles: projectRoles, // Include the project roles associated with the startup
//         };
//         temparray.push(temp);
//       }
//     } else if (req.user.role === "Freelancer") {
//       startUps = await Startup.find({
//         "members.member": req.user._id,
//         "onboarding.status": true,
//       });
//       startupsstatus = await StartupStatus.find({
//         startupid: { $in: startUps.map((startup) => startup._id) },
//       });
//       for (const startup of startUps) {
//         const projectRoles = await ProjectRoles.find({ startupid: startup._id });
//         if (
//           startupsstatus.find((startupstatus) =>
//             startupstatus.startupid.equals(startup._id)
//           )?.status === "Approved"
//         ) {
//           const temp = {
//             _id: startup._id,
//             status: "Approved",
//             userid: startup.userid,
//             logo: startup.logo,
//             businessName: startup.businessName,
//             category: startup.category,
//             budget: startup.budget,
//             stage: startup.stage,
//             roles: projectRoles, // Include the project roles associated with the startup
//           };
//           temparray.push(temp);
//         }
//       }
//     }
//     res.status(200).json({ status: "OK", startUps: temparray });
//   } catch (error) {
//     return next(error);
//   }
// };


// const getAllStartupsbyUserId = async (req, res, next) => {
//   try {
//     const userId = req.body.userId;
//     // Use Mongoose to find startups by userId
//     const startups = await Startup.find({ userid: userId });
//     res.json({success : true , results :  startups});
//   } catch (error) {
//     return next(error);
//   }
// };

const getAllStartupsbyUserId = async (req, res, next) => {
  try {
    const userId = req.body.userId;
    // Use Mongoose to find startups by userId
    const startups = await Startup.find({ userid: userId });

    // Create an array of promises to fetch the roles for each startup
    const startupDataPromises = startups.map(async (startup) => {
      const roles = await ProjectRoles.find({ startupid: startup._id });
      return { startup, roles };
    });

    // Wait for all promises to resolve
    const startupsWithRoles = await Promise.all(startupDataPromises);

    res.json({ success: true, results: startupsWithRoles });
  } catch (error) {
    return next(error);
  }
};


// return next(error);

const getClientStartupsNames = async (req, res, next) => {
  let startUps = [];
  let startupsstatus = [];
  let temparray = [];
  try {
    if (req.user.role === "Startup Owner") {
      startUps = await Startup.find({
        $and: [{ userid: req.user._id }, { "onboarding.status": true }],
      });
      startupsstatus = await StartupStatus.find({
        startupid: { $in: startUps.map((startup) => startup._id) },
        status: "Approved",
      });
      startupsstatus.map((startupstatus) => {
        const temp = {
          _id: startupstatus.startupid,
          businessName: startUps.find((startup) =>
            startup._id.equals(startupstatus.startupid)
          ).businessName,
          logo: startUps.find((startup) =>
            startup._id.equals(startupstatus.startupid)
          ).logo,
        };
        temparray.push(temp);
      });
    }
  } catch (error) {
    return next(error);
  }
  res.status(200).json({ status: "OK", startUps: temparray });
};

const warnMember = async (req, res, next) => {
  let warning;
  try {
    const { startupid, memberid, reason } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!memberid) return next(new BADREQUEST("Please provide a member id"));
    if (!reason) return next(new BADREQUEST("Please provide a reason"));
    warning = await Warning.findOne({ startupid: startupid });
    if (!warning) {
      warning = new Warning({
        startupid: startupid,
        warnings: [
          {
            warnedBy: req.user._id,
            warnedTo: memberid,
            reason: reason,
            status: "Approved",
          },
        ],
      });
      await warning.save();
    } else {
      warning.warnings.push({
        warnedBy: req.user._id,
        warnedTo: memberid,
        reason: reason,
        status: "Approved",
      });
      await warning.save();
    }
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", warning });
};

const getWarningsRequests = async (req, res, next) => {
  let warnings;
  try {
    const { startupid } = req.body;
    warnings = await Warning.find({
      startupid: startupid,
    })
      .populate({
        path: "warnings.warnedBy",
        select: "_id name avatar email",
      })
      .populate({
        path: "warnings.warnedTo",
        select: "_id name avatar email",
      });
    if (warnings.length > 0) {
      warnings = warnings[0].warnings;
      if (warnings.length > 0)
        warnings = warnings.filter((warning) => warning.status === "Request");
      if (!warnings) {
        warnings = [];
      }
    }
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", warnings });
};

const acceptrejectWarning = async (req, res, next) => {
  let warning;
  try {
    const { startupid, warningid, status } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!warningid) return next(new BADREQUEST("Please provide a warning id"));
    if (!status) return next(new BADREQUEST("Please provide a status"));
    warning = await Warning.findOne({ startupid: startupid });
    if (!warning) {
      return next(new NOTFOUND("No warnings found"));
    }
    const found = warning.warnings.find(
      (warning) => warning._id.toString() === warningid
    );
    if (!found) {
      return next(new NOTFOUND("No warning found"));
    }
    found.status = status;
    await warning.save();
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", warning });
};

const getStartupWarnings = async (req, res, next) => {
  let warnings = [];
  try {
    const { startupid } = req.body;
    warnings = await Warning.aggregate([
      {
        $match: {
          startupid: mongoose.Types.ObjectId(startupid),
        },
      },
      {
        $unwind: {
          path: "$warnings",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "warnings.status": "Approved",
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "warnings.warnedTo",
          foreignField: "_id",
          as: "WarnedTo",
        },
      },
      {
        $unwind: {
          path: "$WarnedTo",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "freelancers",
          localField: "WarnedTo._id",
          foreignField: "_id",
          as: "Freelancer",
        },
      },
      {
        $unwind: {
          path: "$Freelancer",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $set: {
          warnings: {
            _id: "$warnings._id",
            status: "$warnings.status",
            warnedTo: {
              _id: "$WarnedTo._id",
              name: "$WarnedTo.name",
              avatar: "$WarnedTo.avatar",
              jobTitle: "$Freelancer.jobTitle",
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          startupid: 1,
          warnings: {
            _id: 1,
            status: 1,
            warnedTo: 1,
            createdAt: 1,
          },
        },
      },
      {
        $group: {
          _id: "$warnings.warnedTo._id",
          startupid: {
            $first: "$startupid",
          },
          warnings: {
            $first: "$warnings",
          },
          WarningCount: {
            $sum: 1,
          },
        },
      },
    ]);
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", warnings });
};

const AllStartups = async (req, res, next) => {
  let approvedStartups;
  let startups;
  try {
    new Promise(async function (resolve, reject) {
      const { page, limit } = req.body;
      approvedStartups = await StartupStatus.find({ status: "Approved" })
        .select("startupid")
        .limit(limit * 1)
        .skip((page - 1) * limit);
      startups = await Startup.find({
        _id: {
          $in: approvedStartups.map((startup) => startup.startupid),
        },
      }).select("_id userid logo businessName category stage budget");
      if (startups) resolve();
    }).then(() => {
      return res.status(200).json({ status: "OK", startups });
    });
  } catch (error) {
    return next(error);
  }
};

const requestCancelOrder = async (req, res, next) => {
  let order;
  try {
    const { orderId, reason } = req.body;
    if (!orderId) return next(new BADREQUEST("Please provide an order id"));
    if (!reason) return next(new BADREQUEST("Please provide a reason"));
    order = await OneTimeOrder.findById(orderId);
    if (!order) return next(new NOTFOUND("No order found"));
    order.status = "RequestedCancelation";
    order.cancelled.reason = reason;
    await order.save();
  } catch (error) {
    return next(error);
  }
  return res
    .status(200)
    .json({ status: "OK", message: "Order Cancelation Requested" });
};

const updatePitchDeck = async (req, res, next) => {
  let startup;
  try {
    const { startupid, pitchdeck } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    if (!pitchdeck) return next(new BADREQUEST("Please provide a pitchdeck"));
    startup = await Startup.findById(startupid);
    if (!startup) return next(new NOTFOUND("No startup found"));
    startup.pitchdeck = pitchdeck;
    await startup.save();
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", startup });
};

const deletePitchDeck = async (req, res, next) => {
  let startup;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    startup = await Startup.findById(startupid);
    if (!startup) return next(new NOTFOUND("No startup found"));
    startup.pitchdeck = null;
    await startup.save();
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", startup });
};

const updateStartup = async (req, res, next) => {
  let startUp;
  try {
    const { startupid } = req.body;
    if (!startupid) return next(new BADREQUEST("Please provide a startup id"));
    startUp = await Startup.findByIdAndUpdate(
      {
        _id: startupid,
        userid: req.user._id,
      },
      {
        $set: {
          ...req.body,
        },
      },
      { new: true, runValidators: true }
    );
    if (!startUp) {
      return next(new NOTFOUND("Startup not found"));
    }
  } catch (error) {
    return next(error);
  }
  return res.status(201).json({ status: "OK", startUp });
};

const getAllCategories = async (req, res, next) => {
  let categories = [];
  try {
    categories = await Category.find({});
  } catch (error) {
    return next(error);
  }
  return res.status(200).json({ status: "OK", categories });
};

const getAllSubcategoriesByCategory = async (req, res, next) => {
  const { categoryId } = req.params;

  try {
    // Find the category
    const category = await Category.findById(categoryId);
    if (!category) {
      return res.status(404).json({ status: "Category not found" });
    }

    // Find all subcategories for the given category
    const subcategories = await Subcategory.find({ category: categoryId });

    return res.status(200).json({ status: "OK", subcategories });
  } catch (error) {
    return next(error);
  }
};

const searchcampaigns = async (req,res,next) => {
  try {
    let {keyword} = req.body;
    let campaigns = await Startup.aggregate([
      {
        $match: {
          "onboarding.status": true,
          "businessName":{$regex: keyword}
        },
        
      },
      {
        $facet: {
          metaData: [
            {
              $count: "total",
            },
          ],
          startups: [
            {
              $sort: {
                createdAt: -1,
              },
            },
            {
              $lookup: {
                from: "startupstatuses",
                localField: "_id",
                foreignField: "startupid",
                as: "status",
              },
            },
            {
              $lookup: {
                from: "users",
                localField: "userid",
                foreignField: "_id",
                as: "startupAdmin",
              },
            },
            {
              $project: {
                _id: 1,
                createdAt: 1,
                logo: 1,
                businessName: 1,
                admin: "$startupAdmin.name",
                email: "$startupAdmin.email",
                status: "$status.status",
              },
            },
            {
              $unwind: "$status",
            },
            {
              $unwind: "$admin",
            },
            {
              $unwind: "$email",
            },
          ],
        },
      },
    ]);
    if (campaigns.length > 0) {
      return res.status(200).json({
        status: "OK",
        results: campaigns.length,
        data: campaigns,
      });
    }
    else {
      return res.status(200).json({
        status: "OK",
        mssg: "No campaigns found",
        data: campaigns,
      });
    }
    
  }
  catch(err) {
    return next(err)

  }
}

export default {
  addProjectRole,
  getAllRoles,
  deleteRole,
  updateRole,
  addTodo,
  getTodos,
  updateTodo,
  deleteTodo,
  addMember,
  getMembers,
  getAllStartupMembers,
  requestMemberRemoval,
  updateMember,
  updateContributorStatus,
  updateTeamMemberStatus,
  addMilestone,
  updateMilestone,
  removeMilestone,
  startupOnboarding,
  addRecord,
  publishStartup,
  getStartupbyId,
  removeStartupMember,
  deleteStartupById,
  getAllStartups,
  getAllStartupsbyUserId,
  getClientStartupsNames,
  warnMember,
  getWarningsRequests,
  acceptrejectWarning,
  getStartupWarnings,
  AllStartups,
  getStartupbyUrl,
  requestCancelOrder,
  updatePitchDeck,
  deletePitchDeck,
  updateStartup,
  getAllCategories,
  getAllSubcategoriesByCategory,
  searchcampaigns
};
