nextjs app
authentication
    - login / register with google
database with supabase

sections:
    - upload statement
        - parse statement and extract transactions dynamically generating a spending or income category
            - use claude to generate the category
        - save the transactions in the database
            - date
            - category
            - amount
            - description
    - transactions
        - list of transaction with the positibility to edit or remove
    - balance
        - per year and per month
        - income
        - spending
        - savings ( positive or negative )
    - categories
        - show expenses by category
    - manage categories
        - add, edit, delete categories
        - assign transaction descriptions to categories
        - on transaction when a category is changed on a transaction, all the other transactions with the same description should be set to the same category

    - make a context with all categories and unique transaction descriptions to be passed to claude when parsing the statement