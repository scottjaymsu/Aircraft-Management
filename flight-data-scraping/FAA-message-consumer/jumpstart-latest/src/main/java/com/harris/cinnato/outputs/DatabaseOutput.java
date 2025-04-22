package com.harris.cinnato.outputs;

import java.io.StringReader;
import java.io.StringWriter;

import javax.xml.stream.XMLInputFactory;
import javax.xml.stream.XMLStreamConstants;
import javax.xml.stream.XMLStreamException;
import javax.xml.stream.XMLStreamReader;

// import org.slf4j.Logger;
// import org.slf4j.LoggerFactory;





import com.typesafe.config.Config;

//Code extended from L3Harris Swim Jumpstart Database Output Class (https://github.com/L3Harris/swim-jumpstart/blob/master/src/main/java/com/l3harris/swim/outputs/database/PostgresOutput.java)
public class DatabaseOutput extends Output {
    // private static final Logger logger = LoggerFactory.getLogger(DatabaseOutput.class);

    public DatabaseOutput(Config config) {
        super(config);
     }

    // Object used to parse the XML message
    private static final XMLInputFactory factory = XMLInputFactory.newInstance();

    /**
     * Main function that accepts messages from the source
     * @param message The string with the main text
     * @param header String with other text that is not relevant
     */
    @Override
    public void output(String message, String header) {
        try {
            XMLStreamReader reader = factory.createXMLStreamReader(new StringReader(message));
            processXml(reader);
            reader.close();
        } 
        catch (Exception e) {
            e.printStackTrace();
        }
    }

    /**
     * Parse the XML to determine if the message is a NetJets flight
     * Uses a buffer system to optimize processing time
     * This will sanitze the xml of its namespaces (i.e. <fdm:fltdMessage> --> <fltdMessage>)
     * @param reader
     * @throws XMLStreamException
     */
    private void processXml(XMLStreamReader reader) throws XMLStreamException {
        // Buffer for storing xml contents as we read it
        StringWriter xmlWriter = new StringWriter();

        boolean isNetJetsFlight = false;

        while (reader.hasNext()) {
            int event = reader.next();

            if (!isNetJetsFlight && event == XMLStreamConstants.START_ELEMENT) {
                // We are looking for 'fltdMessage' objects that are NetJets flights
                String elementName = reader.getLocalName();

                // Check if we are at an <fdm:fltdMessage> tag
                if ("fltdMessage".equals(elementName)) {
                    String acidValue = null;

                    // Scan for the 'acid' attribute
                    for (int i = 0; i < reader.getAttributeCount(); i++) {
                        if ("acid".equals(reader.getAttributeLocalName(i))) {
                            acidValue = reader.getAttributeValue(i);

                            // Stop early when we find the acid
                            break;
                        }
                    }

                    // If 'acid' does not end with "QS", SKIP this entire element
                    if (acidValue == null || !acidValue.endsWith("QS")) {
                        skipElement(reader);
                        continue;
                    }

                    // If valid, process and store the message
                    isNetJetsFlight = true;
                    xmlWriter.getBuffer().setLength(0); // Reset buffer
                    xmlWriter.append("<fltdMessage");

                    // Since we just passed some of the attriubtes, pull them again here
                    // We are saving the xml message to the buffer
                    for (int i = 0; i < reader.getAttributeCount(); i++) {
                        xmlWriter.append(" ")
                                .append(reader.getAttributeLocalName(i))
                                .append("=\"")
                                .append(reader.getAttributeValue(i))
                                .append("\"");
                    }
                    xmlWriter.append(">");
                }
            } 
            else if (isNetJetsFlight) {
                if (event == XMLStreamConstants.END_ELEMENT) {
                    String elementName = reader.getLocalName();

                    // If this is the end of the netjets flight message,
                    // dump the buffer to the message api and reset
                    if ("fltdMessage".equals(elementName) && isNetJetsFlight) {
                        xmlWriter.append("</fltdMessage>");
                        MessageController.storeMessage(xmlWriter.toString());
                        isNetJetsFlight = false;
                    } 
                    // Else, this is the end tag of a nested element, so save it to the buffer and continue
                    else {
                        xmlWriter.append("</")
                            .append(elementName)
                            .append(">");
                    }
                }
                // Else, this is not the end of the message, so save all elements, attributes, and content
                else if (event == XMLStreamConstants.CHARACTERS ) {
                    xmlWriter.append(reader.getText());
                }
                else if (event == XMLStreamConstants.START_ELEMENT) {
                    xmlWriter.append("<").append(reader.getLocalName());

                    // Save all attributes of the element
                    for (int i = 0; i < reader.getAttributeCount(); i++) {
                        xmlWriter.append(" ")
                                .append(reader.getAttributeLocalName(i))
                                .append("=\"")
                                .append(reader.getAttributeValue(i))
                                .append("\"");
                    }
                    xmlWriter.append(">");
                }
            }
        }
    }

    /**
     * Helper function to skip the current xml object
     * @param reader
     * @throws XMLStreamException
     */
    private void skipElement(XMLStreamReader reader) throws XMLStreamException {
        int depth = 1;
        // Speed run thorugh the xml data until we move on to the next object
        while (reader.hasNext() && depth > 0) {
            int event = reader.next();
            if (event == XMLStreamConstants.START_ELEMENT) {
                depth++;
            } else if (event == XMLStreamConstants.END_ELEMENT) {
                depth--;
            }
        }
    }

}
