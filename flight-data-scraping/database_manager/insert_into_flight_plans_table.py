def insert_into_flight_plans_table(connection, flight_plan):
    """
    Inserts flight plan data into the flight_plans table. Builds the SQL dynamically so that only
    non-None fields are included. The SQL statment will only UPDATE columns that are non-None, the others will just stay
    as the same value they were before.
    """

    flight_ref = flight_plan.get('flight_ref')
    acid = flight_plan.get('acid')
    dep_arpt = flight_plan.get('dep_arpt')
    arr_arpt = flight_plan.get('arr_arpt')
    etd = flight_plan.get('etd')
    eta = flight_plan.get('eta')
    status = flight_plan.get('status')
    fbo_id = flight_plan.get('fbo_id')

    if flight_ref is None or acid is None:
        return

    # Start building the query parts
    sql = "INSERT INTO flight_plans (flightRef"
    values = " VALUES (%s"
    updates = " ON DUPLICATE KEY UPDATE "
    params = [flight_ref]

    # Always include acid
    sql += ", acid"
    values += ", %s"
    updates += "acid = VALUES(acid), "
    params.append(acid)

    # Dynamically append columns and values based on which fields are not None
    if dep_arpt is not None:
        sql += ", departing_airport"
        values += ", %s"
        updates += "departing_airport = VALUES(departing_airport), "
        params.append(dep_arpt)

    if arr_arpt is not None:
        sql += ", arrival_airport"
        values += ", %s"
        updates += "arrival_airport = VALUES(arrival_airport), "
        params.append(arr_arpt)

    if etd is not None:
        sql += ", etd"
        values += ", %s"
        updates += "etd = VALUES(etd), "
        params.append(etd)

    if eta is not None:
        sql += ", eta"
        values += ", %s"
        updates += "eta = VALUES(eta), "
        params.append(eta)

    if status is not None:
        sql += ", status"
        values += ", %s"
        updates += "status = VALUES(status), "
        params.append(status)

    if fbo_id is not None:
        sql += ", fbo_id"
        values += ", %s"
        updates += "fbo_id = VALUES(fbo_id), "
        params.append(fbo_id)

    # Close the column and values parts
    sql += ")" + values + ")"

    # Append the update clause if any extra fields were added.
    # Remove the trailing comma and space from the updates clause.
    if updates.strip() != "ON DUPLICATE KEY UPDATE":
        updates = updates.rstrip(", ")
        sql += updates

    try:
        cursor = connection.cursor()
        cursor.execute(sql, tuple(params))
        connection.commit()
        cursor.close()
    except Exception as e:
        print("Error inserting into flight_plans:", e)