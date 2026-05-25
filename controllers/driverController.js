const db = require('../config/db');

// Map of logical Supabase tables to physical MySQL tables
const TABLE_MAPPING = {
  'driver': 'foodzy_driver.driver',
  'driver_location_history': 'foodzy_driver.driver_location_history',
  'driver_daily_incentives': 'foodzy_driver.driver_daily_incentives',
  'driver_incentive_history': 'foodzy_driver.driver_incentive_history',
  'driver_wallet': 'foodzy_driver.driver_wallet',
  'daily_incentive_configs': 'foodzy_driver.daily_incentive_configs',
  'payout_requests': 'foodzy_driver.payout_requests',
  'driver_payouts': 'foodzy_driver.driver_payouts',
  'order_modifications': 'foodzy_driver.order_modifications',
  'warehouse': 'foodzy_driver.warehouse',
  'driver_login_logs': 'foodzy_driver.driver_login_logs',
  'driver_banners': 'foodzy_driver.driver_banners',
  'restaurants': 'foodzy.restaurants',
  'food_items': 'foodzy.food_items',
  'products': 'foodzy.food_items'
};

// Helper to build MySQL WHERE clause from Supabase filters
function buildWhereClause(filters) {
  const whereClauses = [];
  const queryValues = [];
  
  for (const filter of filters) {
    if (filter.type === 'or') {
      const parts = filter.value.split(',');
      const orConditions = [];
      const orValues = [];
      for (const part of parts) {
        const firstDotIdx = part.indexOf('.');
        if (firstDotIdx === -1) continue;
        const field = part.substring(0, firstDotIdx);
        const rest = part.substring(firstDotIdx + 1);
        const secondDotIdx = rest.indexOf('.');
        if (secondDotIdx === -1) continue;
        const op = rest.substring(0, secondDotIdx);
        const val = rest.substring(secondDotIdx + 1);
        
        if (field && op && val !== undefined) {
          let mysqlOp = '=';
          let mysqlVal = val;
          if (op === 'eq') mysqlOp = '=';
          else if (op === 'neq') mysqlOp = '!=';
          else if (op === 'ilike' || op === 'like') {
            mysqlOp = 'LIKE';
            mysqlVal = val.replace(/%/g, '%');
          }
          orConditions.push(`\`${field}\` ${mysqlOp} ?`);
          orValues.push(mysqlVal);
        }
      }
      if (orConditions.length > 0) {
        whereClauses.push(`(${orConditions.join(' OR ')})`);
        queryValues.push(...orValues);
      }
    } else {
      const { field, value, type } = filter;
      if (type === 'eq') {
        whereClauses.push(`\`${field}\` = ?`);
        queryValues.push(value);
      } else if (type === 'neq') {
        whereClauses.push(`\`${field}\` != ?`);
        queryValues.push(value);
      } else if (type === 'gt') {
        whereClauses.push(`\`${field}\` > ?`);
        queryValues.push(value);
      } else if (type === 'gte') {
        whereClauses.push(`\`${field}\` >= ?`);
        queryValues.push(value);
      } else if (type === 'lt') {
        whereClauses.push(`\`${field}\` < ?`);
        queryValues.push(value);
      } else if (type === 'lte') {
        whereClauses.push(`\`${field}\` <= ?`);
        queryValues.push(value);
      } else if (type === 'in') {
        const vals = Array.isArray(value) 
          ? value 
          : String(value).replace(/[()]/g, '').split(',').map(v => v.trim());
        whereClauses.push(`\`${field}\` IN (${vals.map(() => '?').join(',')})`);
        queryValues.push(...vals);
      }
    }
  }
  
  return {
    clause: whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '',
    values: queryValues
  };
}

// Handler for translating Supabase queries to MySQL queries
exports.handleSupabaseQuery = async (req, res) => {
  const {
    table,
    action,
    fields,
    filters = [],
    orderConfig,
    rangeConfig,
    limitConfig,
    singleConfig,
    insertData,
    updateData,
    upsertData
  } = req.body;

  try {
    console.log(`[Proxy] Query table="${table}", action="${action}"`);

    // SPECIAL CASE: orders table (food_orders + ecommerce_orders)
    if (table === 'orders') {
      return handleOrdersQuery(req, res);
    }

    const physicalTable = TABLE_MAPPING[table];
    if (!physicalTable) {
      return res.status(400).json({
        data: null,
        error: { message: `Unsupported or unmapped table: ${table}` }
      });
    }

    if (action === 'select') {
      const { clause, values } = buildWhereClause(filters);
      
      let orderBy = '';
      if (orderConfig) {
        orderBy = `ORDER BY \`${orderConfig.field}\` ${orderConfig.ascending ? 'ASC' : 'DESC'}`;
      }
      
      let limit = '';
      if (limitConfig) {
        limit = `LIMIT ${parseInt(limitConfig)}`;
      } else if (rangeConfig) {
        const offset = parseInt(rangeConfig.from);
        const limitCount = parseInt(rangeConfig.to) - offset + 1;
        limit = `LIMIT ${limitCount} OFFSET ${offset}`;
      }

      const columns = fields === '*' ? '*' : fields.split(',').map(f => `\`${f.trim()}\``).join(', ');
      const sql = `SELECT ${columns} FROM ${physicalTable} ${clause} ${orderBy} ${limit}`;
      
      db.query(sql, values, (err, results) => {
        if (err) {
          console.error(`[Proxy] Select error on ${physicalTable}:`, err.message);
          return res.status(500).json({ data: null, error: err });
        }
        
        // Parse json fields automatically for client compatibility
        results = results.map(row => {
          const newRow = { ...row };
          if (newRow.tiers && typeof newRow.tiers === 'string') {
            try { newRow.tiers = JSON.parse(newRow.tiers); } catch (e) {}
          }
          if (newRow.items && typeof newRow.items === 'string') {
            try { newRow.items = JSON.parse(newRow.items); } catch (e) {}
          }
          return newRow;
        });

        if (singleConfig) {
          return res.status(200).json({ data: results[0] || null, error: null });
        }
        return res.status(200).json({ data: results, error: null });
      });
      
    } else if (action === 'insert') {
      const data = insertData;
      if (!data) return res.status(400).json({ data: null, error: { message: 'Missing insert data' } });
      
      // Serialize object fields to JSON strings
      const preparedData = { ...data };
      for (const k of Object.keys(preparedData)) {
        if (typeof preparedData[k] === 'object' && preparedData[k] !== null) {
          preparedData[k] = JSON.stringify(preparedData[k]);
        }
      }

      const sql = `INSERT INTO ${physicalTable} SET ?`;
      db.query(sql, preparedData, (err, result) => {
        if (err) {
          console.error(`[Proxy] Insert error on ${physicalTable}:`, err.message);
          return res.status(500).json({ data: null, error: err });
        }
        
        if (result.insertId) {
          db.query(`SELECT * FROM ${physicalTable} WHERE id = ?`, [result.insertId], (fetchErr, fetchResults) => {
            if (fetchErr || fetchResults.length === 0) {
              return res.status(200).json({ data: { id: result.insertId, ...data }, error: null });
            }
            const insertedRow = { ...fetchResults[0] };
            if (insertedRow.tiers && typeof insertedRow.tiers === 'string') {
              try { insertedRow.tiers = JSON.parse(insertedRow.tiers); } catch (e) {}
            }
            return res.status(200).json({ data: insertedRow, error: null });
          });
        } else {
          return res.status(200).json({ data: { ...data }, error: null });
        }
      });

    } else if (action === 'update') {
      const data = updateData;
      if (!data) return res.status(400).json({ data: null, error: { message: 'Missing update data' } });

      const { clause, values } = buildWhereClause(filters);
      if (!clause) {
        return res.status(400).json({ data: null, error: { message: 'Update requires a WHERE clause filter' } });
      }

      // Serialize object fields to JSON strings
      const preparedData = { ...data };
      for (const k of Object.keys(preparedData)) {
        if (typeof preparedData[k] === 'object' && preparedData[k] !== null) {
          preparedData[k] = JSON.stringify(preparedData[k]);
        }
      }

      const sql = `UPDATE ${physicalTable} SET ? ${clause}`;
      db.query(sql, [preparedData, ...values], (err, result) => {
        if (err) {
          console.error(`[Proxy] Update error on ${physicalTable}:`, err.message);
          return res.status(500).json({ data: null, error: err });
        }
        return res.status(200).json({ data: result, error: null });
      });

    } else if (action === 'upsert') {
      const data = upsertData;
      if (!data) return res.status(400).json({ data: null, error: { message: 'Missing upsert data' } });

      // Upsert translation to MySQL INSERT ... ON DUPLICATE KEY UPDATE
      const preparedData = { ...data };
      const keys = Object.keys(preparedData);
      const placeholders = keys.map(() => '?').join(', ');
      const updates = keys.map(k => `\`${k}\` = VALUES(\`${k}\`)`).join(', ');
      
      const sql = `INSERT INTO ${physicalTable} (${keys.map(k => `\`${k}\``).join(', ')}) VALUES (${placeholders}) ON DUPLICATE KEY UPDATE ${updates}`;
      
      const values = keys.map(key => {
        if (typeof preparedData[key] === 'object' && preparedData[key] !== null) {
          return JSON.stringify(preparedData[key]);
        }
        return preparedData[key];
      });

      db.query(sql, values, (err, result) => {
        if (err) {
          console.error(`[Proxy] Upsert error on ${physicalTable}:`, err.message);
          return res.status(500).json({ data: null, error: err });
        }
        return res.status(200).json({ data: result, error: null });
      });
    }

  } catch (error) {
    console.error('[Proxy] Query exception:', error);
    return res.status(500).json({
      data: null,
      error: { message: error.message }
    });
  }
};

// SPECIAL HANDLER: orders table (aggregates/redirects to food_orders and ecommerce_orders)
async function handleOrdersQuery(req, res) {
  const {
    action,
    fields,
    filters = [],
    orderConfig,
    rangeConfig,
    limitConfig,
    singleConfig,
    updateData
  } = req.body;

  try {
    const { clause, values } = buildWhereClause(filters);

    if (action === 'select') {
      // Fetch from food_orders
      const foodSql = `SELECT *, FALSE AS is_ecommerce FROM foodzy.food_orders ${clause}`;
      const ecommerceSql = `SELECT *, TRUE AS is_ecommerce FROM foodzy.ecommerce_orders ${clause}`;

      const runQuery = (sql, vals) => {
        return new Promise((resolve) => {
          db.query(sql, vals, (err, results) => {
            if (err) {
              console.error(`[Proxy] Orders sub-query failed:`, err.message);
              resolve([]);
            } else {
              resolve(results);
            }
          });
        });
      };

      const [foodOrders, ecommerceOrders] = await Promise.all([
        runQuery(foodSql, values),
        runQuery(ecommerceSql, values)
      ]);

      let combined = [...foodOrders, ...ecommerceOrders];

      // Parse JSON items if needed
      combined = combined.map(row => {
        const newRow = { ...row };
        if (newRow.items && typeof newRow.items === 'string') {
          try { newRow.items = JSON.parse(newRow.items); } catch (e) {}
        }
        return newRow;
      });

      // Sort
      if (orderConfig) {
        const field = orderConfig.field;
        const asc = orderConfig.ascending;
        combined.sort((a, b) => {
          const valA = a[field];
          const valB = b[field];
          if (valA === valB) return 0;
          if (valA === null || valA === undefined) return 1;
          if (valB === null || valB === undefined) return -1;
          
          if (field === 'created_at') {
            return asc 
              ? new Date(valA) - new Date(valB)
              : new Date(valB) - new Date(valA);
          }
          return asc
            ? (valA > valB ? 1 : -1)
            : (valA < valB ? 1 : -1);
        });
      } else {
        // Default sort by created_at DESC
        combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      }

      // Range/Limit
      if (limitConfig) {
        combined = combined.slice(0, parseInt(limitConfig));
      } else if (rangeConfig) {
        const offset = parseInt(rangeConfig.from);
        const end = parseInt(rangeConfig.to);
        combined = combined.slice(offset, end + 1);
      }

      if (singleConfig) {
        return res.status(200).json({ data: combined[0] || null, error: null });
      }
      return res.status(200).json({ data: combined, count: combined.length, error: null });

    } else if (action === 'update') {
      if (!updateData) {
        return res.status(400).json({ data: null, error: { message: 'Missing update data' } });
      }

      // Serialize objects
      const preparedData = { ...updateData };
      if (preparedData.items && typeof preparedData.items !== 'string') {
        preparedData.items = JSON.stringify(preparedData.items);
      }

      // We need to update whichever table has the matching order ID.
      // Usually, there is a filter like `id = ?`
      const idFilter = filters.find(f => f.field === 'id' && f.type === 'eq');
      if (!idFilter) {
        return res.status(400).json({ data: null, error: { message: 'Updating orders requires an ID eq filter' } });
      }
      const orderId = idFilter.value;

      // Try updating food_orders first
      db.query('UPDATE foodzy.food_orders SET ? WHERE id = ?', [preparedData, orderId], (err1, result1) => {
        if (err1) {
          console.error('[Proxy] Error updating food_orders:', err1.message);
        }
        if (result1 && result1.affectedRows > 0) {
          return res.status(200).json({ data: result1, error: null });
        }

        // If not affected, try updating ecommerce_orders
        db.query('UPDATE foodzy.ecommerce_orders SET ? WHERE id = ?', [preparedData, orderId], (err2, result2) => {
          if (err2) {
            console.error('[Proxy] Error updating ecommerce_orders:', err2.message);
            return res.status(500).json({ data: null, error: err2 });
          }
          return res.status(200).json({ data: result2, error: null });
        });
      });
    }

  } catch (error) {
    console.error('[Proxy] Error handling orders query:', error);
    return res.status(500).json({ data: null, error: { message: error.message } });
  }
}
