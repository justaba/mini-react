import { MyReact } from "../myreact/index";
import "./App.css";

function randomId() {
  return Math.random()
    .toString(36)
    .replace(/[^a-z]+/g, "")
    .substr(2, 10);
}

/** @jsx MyReact.createElement */
export const App = () => {
  const [list, setList] = MyReact.useState([]);
  const [name, setName] = MyReact.useState("");
  const [phone, setPhone] = MyReact.useState("");
  const [error, setError] = MyReact.useState("");

  const handleChange = (e) => {
    const name = e.target.name;
    const value = e.target.value;
    switch (name) {
      case "name":
        setName(value);
        break;
      case "phone":
        setPhone(value);
        break;
    }
  };

  const handleAdd = () => {
    if (name && phone) {
      if (validatePhone(phone)) {
        setList([...list, { id: randomId(), name, phone }]);
        setError("")
      } else {
        setError("Phone number is entered incorrectly");
      }
    } else {
      setError("Fill in all the fields");
    }
  };

  const handleDelete = (id) => {
    setList([...list.filter((item) => item.id != id)]);
  };

  const handleEdit = (id) => {
    setList([
      ...list.map((item) => {
        if (item.id === id) return { ...item, edit: true };
        return item;
      }),
    ]);
  };

  const handleSaveEdit = (id) => {
    if (name && phone) {
      if (validatePhone(phone)) {
        setList([
          ...list.map((item) => {
            if (item.id === id)
              return {
                ...item,
                name,
                phone,
                edit: false,
              };
            return item;
          }),
        ]);
        setError("")
      } else {
        setError("Phone number is entered incorrectly");
      }
    } else {
      setError("Fill in all the fields");
    }
  };

  const validatePhone = (number) => {
    let mask = /^[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4,6}$/im;

    return mask.test(number);
  };

  return (
    <div className="wrap">
      <div className="users">
        <h1>User list</h1>
        <div className="user-table">
          <div className="head">
            <div className="head-name">
              <b>Name</b>
            </div>
            <div className="head-phone">
              <b>Phone</b>
            </div>
          </div>
          <div className="user-list">
            {list.map((item) => (
              <div className="user">
                {item.edit ? (
                  <div className="user-main">
                    <input
                      className="user-name"
                      name="name"
                      onInput={handleChange}
                      type="text"
                      value={item.name}
                    />
                    <input
                      className="user-phone"
                      name="phone"
                      onInput={handleChange}
                      type="text"
                      value={item.phone}
                    />
                  </div>
                ) : (
                  <div className="user-main">
                    <div className="user-name">{item.name}</div>
                    <div className="user-phone">{item.phone}</div>
                  </div>
                )}
                {item.edit ? (
                  <div
                    className="user-event"
                    onClick={() => handleSaveEdit(item.id)}
                  >
                    save
                  </div>
                ) : (
                  <div
                    className="user-event"
                    onClick={() => handleEdit(item.id)}
                  >
                    edit
                  </div>
                )}
                <div
                  className="user-event"
                  onClick={() => handleDelete(item.id)}
                >
                  delete
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="error">{error}</div>
        <div className="add-user">
          <input
            placeholder="User name"
            name="name"
            onInput={handleChange}
            type="text"
          />
          <input
            placeholder="User phone +7999123456"
            name="phone"
            onInput={handleChange}
            type="text"
          />
          <button onClick={handleAdd}>Add</button>
        </div>
      </div>
    </div>
  );
};
