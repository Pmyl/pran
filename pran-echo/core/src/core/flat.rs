pub fn flat(to_flat: Vec<Vec<String>>) -> Vec<String> {
    let mut new_vec = vec![];

    for list in to_flat {
        for item in list {
            new_vec.push(item);
        }
    }

    new_vec
}