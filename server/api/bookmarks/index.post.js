import { defineEventHandler, readBody, createError } from 'h3';
import User from '../../models/User.model';

export default defineEventHandler(async (event) => {
  // --- Authentication Check --- 
    const user = event.context.user;
    
  if (!user || !user.id) { // Check for user and user._id
    throw createError({ statusCode: 401, statusMessage: 'Unauthorized' });
  }
  const userId = user.id;

  try {
    const body = await readBody(event);
    const { itemId, itemType, action } = body;

    if (!itemId || !itemType || !['add', 'remove'].includes(action)) {
        throw createError({ statusCode: 400, statusMessage: 'Invalid input: itemId, itemType, and action (add/remove) are required.' });
    }

    if (itemType !== 'scenario') {
        throw createError({ statusCode: 400, statusMessage: 'Invalid input: Only scenario bookmarks are supported.' });
    }

    let updateOperation = {};
    const fieldToUpdate = 'bookmarkedScenarios';

    if (action === 'add') {
        updateOperation = { $addToSet: { [fieldToUpdate]: itemId } };
    } else { // action === 'remove'
        updateOperation = { $pull: { [fieldToUpdate]: itemId } };
    }

    const updateResult = await User.findOneAndUpdate({ _id: userId }, updateOperation, { new: true });

    if (!updateResult) {
        throw createError({ statusCode: 404, statusMessage: 'User not found for bookmark update.' });
    }
    
    return { success: true, action, itemType: 'scenario', itemId };

  } catch (error) {
    if (error.statusCode) throw error;
    throw createError({ statusCode: 500, statusMessage: 'Internal Server Error processing bookmark request' });
  }
}); 