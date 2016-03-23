extern crate websocket;
extern crate rustc_serialize;

use std::thread;
use std::sync::{Arc, Mutex};
use std::sync::mpsc::channel;
use rustc_serialize::json;
use websocket::{Server, Message, Sender, Receiver};
use websocket::message::Type;
use websocket::header::WebSocketProtocol;
use std::io::Read;
use websocket::ws::dataframe::DataFrame;
use websocket::WebSocketStream;

#[derive(RustcDecodable, RustcEncodable, Debug)]
pub struct ComicMessage {
    message_type: String,
    text: String
    // room: String,
    // time: String,
    // text: String,
    // author: String
}

fn main() {
    let host = "0.0.0.0:8084";
    let server = Server::bind(host).unwrap();

    let (broadcast_tx, broadcast_rx) = channel::<Message>();
    let clients: Arc<Mutex<Vec<std::sync::mpsc::Sender<Message>>>> = Arc::new(Mutex::new(Vec::new()));

    // Cross-client broadcast
    let broadcast_connections = clients.clone();
    thread::spawn(move || {
        println!("broadcast thread running");
        for message in broadcast_rx.iter() {
            for conn_tx in broadcast_connections.lock().unwrap().iter() {
                // println!("Sending to client: {}", message.clone());
                conn_tx.send(message.clone());
            }
        }
    });

    for connection in server {
        let broadcast_tx_local = broadcast_tx.clone();
        let (conn_tx, conn_rx) = channel::<Message>();
        clients.lock().unwrap().push(conn_tx.clone());

        // Receive from client
        thread::spawn(move || {
            let request = connection.unwrap().read_request().unwrap();
            let headers = request.headers.clone();
            request.validate().unwrap();

            let mut response = request.accept();

            if let Some(&WebSocketProtocol(ref protocols)) = headers.get() {
                if protocols.contains(&("comic-chat".to_string())) {
                    response.headers.set(WebSocketProtocol(vec!["comic-chat".to_string()]));
                }
            }

            let mut client = response.send().unwrap();
            let client_ip = client.get_mut_sender().get_mut().peer_addr().unwrap();
            println!("Connection from {}", client_ip);

            let message: Message = Message::text("Connected".to_string());
            client.send_message(&message).unwrap();

            let (mut sender, mut receiver) = client.split();

            thread::spawn(move || {
                for message in receiver.incoming_messages() {
                    let message: Message = message.unwrap();

                    match message.opcode {
                        Type::Close => {
                            println!("Client {} disconencted", client_ip);
                            conn_tx.send(Message::close());
                            return;
                        },
                        Type::Ping => {
                            conn_tx.send(Message::pong(message.payload));
                        },
                        Type::Text => {
                            let payload = String::from_utf8(message.payload().into_owned()).expect("failed to convert payload into string");
                            let deserialized: ComicMessage = json::decode(&payload).expect("failed to decode JSON");
                            println!("Received: {:?}", deserialized);

                            match deserialized.message_type.as_ref() {
                                "message" => broadcast_tx_local.send(Message::text(deserialized.text)).unwrap(),
                                _ => return // closes connection
                            }
                        },
                        _ => return
                    }
                }
            });

            // Respond to client
            thread::spawn(move || {
                for message in conn_rx.iter() {
                    println!("yay!");
                    sender.send_message(&message);
                }
            });
        });
    }
}

#[cfg(test)]
mod tests {
    #[test]
    fn it_works() {
    }
}
